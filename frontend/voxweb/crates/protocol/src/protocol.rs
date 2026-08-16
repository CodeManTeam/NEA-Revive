//! Protocol message layer — MuMessageFactory/MuProtocolFactory equivalent.
//!
//! Mirrors Shared/mudb protocol.js:
//! - Each protocol registers a list of messages; ids are assigned per
//!   protocol with `idBase += messageNames.length + 1`.
//! - A message frame is `writeVarint(idBase + messageId) + diff(identity,
//!   payload)`. Parsing reads the id varint, then patches identity if bytes
//!   remain, else clones identity.
//! - Message names are sorted (JS `Object.keys(schema).sort()`).

use crate::json::schema_from_json;
use crate::schema::Schema;
use crate::stream::{ReadStream, WriteStream};
use crate::Value;

/// A single protocol: name + client-direction (client parses) and
/// server-direction (client sends) message schemas, in wire order.
#[derive(Clone, Debug)]
pub struct Protocol {
    pub name: String,
    pub client_messages: Vec<(String, Schema)>,
    pub server_messages: Vec<(String, Schema)>,
}

/// The full 20-protocol wire table with computed id bases.
#[derive(Clone, Debug)]
pub struct ProtocolTable {
    pub protocols: Vec<Protocol>,
    /// idBase per protocol for the CLIENT direction (client->server msgs are
    /// parsed with these ids on the wire from the server).
    pub client_id_bases: Vec<u32>,
    /// idBase per protocol for the SERVER direction (client->server sends).
    pub server_id_bases: Vec<u32>,
}

impl ProtocolTable {
    /// Build the table from the exported protocols.json (see
    /// tools/parity/gen-protocols.mjs). Returns the table plus the JS-side
    /// idBase arrays for parity assertion.
    pub fn from_json(j: &serde_json::Value) -> Result<(Self, Vec<u32>, Vec<u32>), String> {
        let mut protocols = Vec::new();
        for p in j["protocols"].as_array().ok_or("protocols missing")? {
            let name = p["name"].as_str().unwrap_or("").to_string();
            let client_messages = parse_messages(&p["client"])?;
            let server_messages = parse_messages(&p["server"])?;
            protocols.push(Protocol {
                name,
                client_messages,
                server_messages,
            });
        }
        let js_client = read_u32s(&j["clientIdBases"])?;
        let js_server = read_u32s(&j["serverIdBases"])?;
        let client_id_bases = compute_id_bases(&protocols, true);
        let server_id_bases = compute_id_bases(&protocols, false);
        Ok((
            Self {
                protocols,
                client_id_bases,
                server_id_bases,
            },
            js_client,
            js_server,
        ))
    }

    /// Find a protocol by name (client-direction messages).
    pub fn client_schema(&self, protocol: &str, message: &str) -> Option<&Schema> {
        let p = self.protocols.iter().find(|p| p.name == protocol)?;
        p.client_messages
            .iter()
            .find(|(n, _)| n == message)
            .map(|(_, s)| s)
    }

    /// Find a protocol by name (server-direction messages).
    pub fn server_schema(&self, protocol: &str, message: &str) -> Option<&Schema> {
        let p = self.protocols.iter().find(|p| p.name == protocol)?;
        p.server_messages
            .iter()
            .find(|(n, _)| n == message)
            .map(|(_, s)| s)
    }

    /// Encode a client->server message frame: varint(idBase+msgId) + diff.
    pub fn encode_server_message(
        &self,
        protocol: &str,
        message: &str,
        payload: &Value,
    ) -> Result<Vec<u8>, String> {
        let pi = self
            .protocols
            .iter()
            .position(|p| p.name == protocol)
            .ok_or_else(|| format!("unknown protocol {protocol}"))?;
        let (name, schema) = self.protocols[pi]
            .server_messages
            .iter()
            .find(|(n, _)| n == message)
            .ok_or_else(|| format!("unknown server message {protocol}.{message}"))?;
        let mi = self.protocols[pi]
            .server_messages
            .iter()
            .position(|(n, _)| n == name)
            .unwrap();
        let id = self.server_id_bases[pi] + mi as u32;
        let mut out = WriteStream::new(128);
        out.write_varint(id);
        let identity = schema.identity();
        schema.diff(&identity, payload, &mut out);
        Ok(out.bytes)
    }

    /// Encode a server->client message frame (used by the backend side; kept
    /// for completeness/parity).
    pub fn encode_client_message(
        &self,
        protocol: &str,
        message: &str,
        payload: &Value,
    ) -> Result<Vec<u8>, String> {
        let pi = self
            .protocols
            .iter()
            .position(|p| p.name == protocol)
            .ok_or_else(|| format!("unknown protocol {protocol}"))?;
        let (name, schema) = self.protocols[pi]
            .client_messages
            .iter()
            .find(|(n, _)| n == message)
            .ok_or_else(|| format!("unknown client message {protocol}.{message}"))?;
        let mi = self.protocols[pi]
            .client_messages
            .iter()
            .position(|(n, _)| n == name)
            .unwrap();
        let id = self.client_id_bases[pi] + mi as u32;
        let mut out = WriteStream::new(128);
        out.write_varint(id);
        let identity = schema.identity();
        schema.diff(&identity, payload, &mut out);
        Ok(out.bytes)
    }

    /// Parse a server->client frame. Returns (protocol name, message name,
    /// decoded value). Handles the raw tail (schema-less) by returning
    /// (protocol, "raw", bytes).
    pub fn parse_client_frame(
        &self,
        bytes: &[u8],
    ) -> Result<(String, String, ParsedMessage), String> {
        let mut inp = ReadStream::new(bytes);
        let id = inp.read_varint()?;
        // locate id in client-direction table (idBase + msgId)
        for (pi, p) in self.protocols.iter().enumerate() {
            let base = self.client_id_bases[pi];
            if id < base {
                continue;
            }
            let rel = (id - base) as usize;
            if rel >= p.client_messages.len() {
                continue;
            }
            let (name, schema) = &p.client_messages[rel];
            if inp.remaining() > 0 {
                let value = schema.patch(&schema.identity(), &mut inp)?;
                return Ok((p.name.clone(), name.clone(), ParsedMessage::Value(value)));
            }
            return Ok((
                p.name.clone(),
                name.clone(),
                ParsedMessage::Value(schema.clone_value(&schema.identity())),
            ));
        }
        Err(format!("invalid message id {id}"))
    }
}

pub enum ParsedMessage {
    Value(Value),
}

fn parse_messages(j: &serde_json::Value) -> Result<Vec<(String, Schema)>, String> {
    let msgs = j["messages"].as_array().ok_or("messages missing")?;
    let mut out = Vec::with_capacity(msgs.len());
    for m in msgs {
        let name = m["name"].as_str().unwrap_or("").to_string();
        let schema = schema_from_json(&m["schema"])?;
        out.push((name, schema));
    }
    Ok(out)
}

fn read_u32s(j: &serde_json::Value) -> Result<Vec<u32>, String> {
    j.as_array()
        .ok_or_else(|| "expected array".to_string())?
        .iter()
        .map(|v| {
            v.as_u64()
                .map(|x| x as u32)
                .ok_or_else(|| "expected number".to_string())
        })
        .collect()
}

/// JS MuProtocolFactory: idBase advances by messageNames.length + 1 per
/// protocol, starting at 0. `client` selects the client-direction table.
fn compute_id_bases(protocols: &[Protocol], client: bool) -> Vec<u32> {
    let mut bases = Vec::with_capacity(protocols.len());
    let mut counter: u32 = 0;
    for p in protocols {
        bases.push(counter);
        let n = if client {
            p.client_messages.len()
        } else {
            p.server_messages.len()
        };
        counter += n as u32 + 1;
    }
    bases
}

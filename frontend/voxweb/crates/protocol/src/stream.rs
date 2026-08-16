//! MuDB byte stream codec — byte-exact port of Shared/mudb `stream/index.js`.
//!
//! Wire semantics preserved 1:1:
//! - varint: unsigned LEB128 over u32, max 5 bytes (5th byte carries x>>>28).
//! - fixed ints/floats: little-endian IEEE-754 (JS DataView littleEndian=true).
//! - utf8: varint(byteLength) + UTF-8 bytes (TextEncoder).
//! - ascii: varint(len) + one byte per charCode (no encoding).

/// Growable write stream (JS MuWriteStream equivalent; no pooling needed).
#[derive(Clone, Debug)]
pub struct WriteStream {
    pub bytes: Vec<u8>,
}

impl WriteStream {
    pub fn new(capacity: usize) -> Self {
        Self {
            bytes: Vec::with_capacity(capacity.max(2)),
        }
    }

    /// JS `grow(n)` — reserve at least offset+n capacity.
    pub fn grow(&mut self, n: usize) {
        let needed = self.bytes.len() + n;
        if self.bytes.capacity() < needed {
            self.bytes.reserve(needed - self.bytes.len());
        }
    }

    pub fn len(&self) -> usize {
        self.bytes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.bytes.is_empty()
    }

    /// JS writeVarint: `x >>> 0` then 7-bit groups, continuation bit 0x80.
    pub fn write_varint(&mut self, x: u32) {
        let x = x as u32;
        if x < 0x80 {
            self.bytes.push(x as u8);
        } else if x < 0x4000 {
            self.bytes.push((x & 0x7f) as u8 | 0x80);
            self.bytes.push((x >> 7) as u8);
        } else if x < 0x200000 {
            self.bytes.push((x & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 7) & 0x7f) as u8 | 0x80);
            self.bytes.push((x >> 14) as u8);
        } else if x < 0x10000000 {
            self.bytes.push((x & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 7) & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 14) & 0x7f) as u8 | 0x80);
            self.bytes.push((x >> 21) as u8);
        } else {
            self.bytes.push((x & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 7) & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 14) & 0x7f) as u8 | 0x80);
            self.bytes.push(((x >> 21) & 0x7f) as u8 | 0x80);
            self.bytes.push((x >> 28) as u8);
        }
    }

    /// JS writeUint8 (1 byte LE).
    pub fn write_u8(&mut self, x: u8) {
        self.bytes.push(x);
    }

    /// JS writeInt8.
    pub fn write_i8(&mut self, x: i8) {
        self.bytes.push(x as u8);
    }

    /// JS writeUint16 (LE).
    pub fn write_u16(&mut self, x: u16) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeInt16 (LE).
    pub fn write_i16(&mut self, x: i16) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeUint32 (LE).
    pub fn write_u32(&mut self, x: u32) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeInt32 (LE).
    pub fn write_i32(&mut self, x: i32) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeFloat32 (LE IEEE-754).
    pub fn write_f32(&mut self, x: f32) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeFloat64 (LE IEEE-754).
    pub fn write_f64(&mut self, x: f64) {
        self.bytes.extend_from_slice(&x.to_le_bytes());
    }

    /// JS writeASCII — one byte per char (charCode must be <= 0xFF).
    pub fn write_ascii(&mut self, s: &str) {
        for b in s.bytes() {
            self.bytes.push(b);
        }
    }

    /// JS writeString — varint(byteLength) + UTF-8 bytes.
    pub fn write_utf8(&mut self, s: &str) {
        let encoded = s.as_bytes();
        self.grow(5 + encoded.len());
        self.write_varint(encoded.len() as u32);
        self.bytes.extend_from_slice(encoded);
    }

    /// JS writeUint8At — patch a byte at an absolute offset.
    pub fn write_u8_at(&mut self, offset: usize, x: u8) {
        self.bytes[offset] = x;
    }

    /// JS writeUint32At — patch 4 LE bytes at an absolute offset.
    pub fn write_u32_at(&mut self, offset: usize, x: u32) {
        let le = x.to_le_bytes();
        self.bytes[offset..offset + 4].copy_from_slice(&le);
    }

    /// JS `bytes()` — the written buffer.
    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }
}

/// Read stream over an immutable byte slice (JS MuReadStream equivalent).
#[derive(Clone, Debug)]
pub struct ReadStream<'a> {
    data: &'a [u8],
    pub offset: usize,
}

impl<'a> ReadStream<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self { data, offset: 0 }
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn remaining(&self) -> usize {
        self.data.len() - self.offset
    }

    fn check_bounds(&self) -> Result<(), String> {
        if self.offset > self.data.len() {
            Err("out of bounds".to_string())
        } else {
            Ok(())
        }
    }

    /// JS readVarint (see write_varint for the wire layout).
    pub fn read_varint(&mut self) -> Result<u32, String> {
        let bytes = self.data;
        let mut offset = self.offset;
        let x0 = *bytes.get(offset).ok_or("out of bounds")?;
        offset += 1;
        if x0 < 0x80 {
            self.offset = offset;
            self.check_bounds()?;
            return Ok(x0 as u32);
        }
        let x1 = *bytes.get(offset).ok_or("out of bounds")?;
        offset += 1;
        if x1 < 0x80 {
            self.offset = offset;
            self.check_bounds()?;
            return Ok(((x0 & 0x7f) as u32) | ((x1 as u32) << 7));
        }
        let x2 = *bytes.get(offset).ok_or("out of bounds")?;
        offset += 1;
        if x2 < 0x80 {
            self.offset = offset;
            self.check_bounds()?;
            return Ok(((x0 & 0x7f) as u32) | (((x1 & 0x7f) as u32) << 7) | ((x2 as u32) << 14));
        }
        let x3 = *bytes.get(offset).ok_or("out of bounds")?;
        offset += 1;
        if x3 < 0x80 {
            self.offset = offset;
            self.check_bounds()?;
            return Ok(((x0 & 0x7f) as u32)
                | (((x1 & 0x7f) as u32) << 7)
                | (((x2 & 0x7f) as u32) << 14)
                | ((x3 as u32) << 21));
        }
        let x4 = *bytes.get(offset).ok_or("out of bounds")?;
        offset += 1;
        self.offset = offset;
        self.check_bounds()?;
        Ok((x0 & 0x7f) as u32
            + (((x1 & 0x7f) as u32) << 7)
            + (((x2 & 0x7f) as u32) << 14)
            + (((x3 & 0x7f) as u32) << 21)
            + ((x4 as u32) * (1 << 28)))
    }

    pub fn read_u8(&mut self) -> Result<u8, String> {
        let v = *self.data.get(self.offset).ok_or("out of bounds")?;
        self.offset += 1;
        self.check_bounds()?;
        Ok(v)
    }

    pub fn read_i8(&mut self) -> Result<i8, String> {
        Ok(self.read_u8()? as i8)
    }

    pub fn read_u16(&mut self) -> Result<u16, String> {
        let b = self
            .data
            .get(self.offset..self.offset + 2)
            .ok_or("out of bounds")?;
        self.offset += 2;
        self.check_bounds()?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }

    pub fn read_i16(&mut self) -> Result<i16, String> {
        Ok(self.read_u16()? as i16)
    }

    pub fn read_u32(&mut self) -> Result<u32, String> {
        let b = self
            .data
            .get(self.offset..self.offset + 4)
            .ok_or("out of bounds")?;
        self.offset += 4;
        self.check_bounds()?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    pub fn read_i32(&mut self) -> Result<i32, String> {
        Ok(self.read_u32()? as i32)
    }

    pub fn read_f32(&mut self) -> Result<f32, String> {
        Ok(f32::from_bits(self.read_u32()?))
    }

    pub fn read_f64(&mut self) -> Result<f64, String> {
        let b = self
            .data
            .get(self.offset..self.offset + 8)
            .ok_or("out of bounds")?;
        self.offset += 8;
        self.check_bounds()?;
        Ok(f64::from_le_bytes([
            b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
        ]))
    }

    /// JS readASCII(length) — raw bytes to string.
    pub fn read_ascii(&mut self, length: u32) -> Result<String, String> {
        let head = self.offset;
        self.offset += length as usize;
        self.check_bounds()?;
        let mut s = String::with_capacity(length as usize);
        for &b in &self.data[head..self.offset] {
            s.push(b as char);
        }
        Ok(s)
    }

    /// JS readString — varint(byteLength) + UTF-8.
    pub fn read_utf8(&mut self) -> Result<String, String> {
        let byte_length = self.read_varint()? as usize;
        let head = self.offset;
        self.offset += byte_length;
        self.check_bounds()?;
        let bytes = &self.data[head..self.offset];
        String::from_utf8(bytes.to_vec()).map_err(|e| format!("invalid utf8: {e}"))
    }

    /// JS readUint8At — absolute offset read.
    pub fn read_u8_at(&self, offset: usize) -> Result<u8, String> {
        self.data
            .get(offset)
            .copied()
            .ok_or_else(|| "out of bounds".to_string())
    }

    /// JS `bytes()` — remaining slice.
    pub fn remaining_bytes(&self) -> &'a [u8] {
        &self.data[self.offset..]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn varint_roundtrip_boundaries() {
        let cases: [u32; 9] = [
            0, 1, 0x7f, 0x80, 0x3fff, 0x4000, 0x1fffff, 0x200000, 0xffffffff,
        ];
        for c in cases {
            let mut w = WriteStream::new(8);
            w.write_varint(c);
            let mut r = ReadStream::new(&w.bytes);
            assert_eq!(r.read_varint().unwrap(), c, "value {c:#x}");
            assert_eq!(r.remaining(), 0);
        }
    }

    #[test]
    fn varint_known_bytes() {
        // 0x80 -> [0x80, 0x01]
        let mut w = WriteStream::new(4);
        w.write_varint(0x80);
        assert_eq!(w.bytes, vec![0x80, 0x01]);
        // 300 -> [0xAC, 0x02]
        let mut w = WriteStream::new(4);
        w.write_varint(300);
        assert_eq!(w.bytes, vec![0xAC, 0x02]);
        // 0xffffffff -> 5 bytes [0xff x4, 0x0f]
        let mut w = WriteStream::new(8);
        w.write_varint(0xffffffff);
        assert_eq!(w.bytes, vec![0xff, 0xff, 0xff, 0xff, 0x0f]);
    }

    #[test]
    fn fixed_ints_le() {
        let mut w = WriteStream::new(32);
        w.write_u16(0x1234);
        w.write_i16(-2);
        w.write_u32(0xdeadbeef);
        w.write_i32(-1);
        w.write_f32(1.5);
        w.write_f64(-2.25);
        let mut r = ReadStream::new(&w.bytes);
        assert_eq!(r.read_u16().unwrap(), 0x1234);
        assert_eq!(r.read_i16().unwrap(), -2);
        assert_eq!(r.read_u32().unwrap(), 0xdeadbeef);
        assert_eq!(r.read_i32().unwrap(), -1);
        assert_eq!(r.read_f32().unwrap(), 1.5);
        assert_eq!(r.read_f64().unwrap(), -2.25);
    }

    #[test]
    fn utf8_and_ascii_roundtrip() {
        let mut w = WriteStream::new(32);
        w.write_utf8("中文🎮");
        w.write_ascii("ABC");
        let mut r = ReadStream::new(&w.bytes);
        assert_eq!(r.read_utf8().unwrap(), "中文🎮");
        assert_eq!(r.read_ascii(3).unwrap(), "ABC");
    }
}

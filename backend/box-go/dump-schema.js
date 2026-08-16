// ============================================================
// mudb Schema Dumper
// ============================================================
// 用法：
//   1. 在你的游戏客户端中，把 MuClient 实例存到全局
//      例如：window.__mudb = client
//   2. 在浏览器控制台粘贴本脚本，或 import 后运行
//   3. 脚本会输出可复现的 Schema 定义代码
// ============================================================

(function (globalVarName = '__mudb') {
  const client = typeof globalThis !== 'undefined'
    ? globalThis[globalVarName]
    : global[globalVarName];

  if (!client) {
    console.error(`[mudb-dump] 未找到全局变量 "${globalVarName}"`);
    console.error(`[mudb-dump] 请先执行: window.${globalVarName} = <你的MuClient实例或Schema定义对象>; 然后重新运行`);
    return;
  }

  // ============================================================
  // 核心：识别对象类型 + 递归提取 Schema
  // ============================================================

  // 判断一个值是不是 MuSchema 实例（有 muType 字段）
  function isMuSchema(v) {
    return v && typeof v === 'object' && typeof v.muType === 'string';
  }

  // 判断一个值是不是 protocol schema 定义体（有 client 和/或 server，且值里包含 MuSchema）
  function isProtocolDef(v) {
    if (!v || typeof v !== 'object') return false;
    // 有 client 或 server 属性，且它们包含 muType 对象
    const checkSide = (side) => {
      if (!side || typeof side !== 'object') return false;
      return Object.values(side).some(v => isMuSchema(v));
    };
    return checkSide(v.client) || checkSide(v.server);
  }

  // 判断一个值是不是 RDA 实例
  function isRDA(v) {
    return v && typeof v === 'object' &&
      (v.muType === 'rda/constant' || v.muType === 'rda/register' ||
       v.muType === 'rda/struct' || v.muType === 'rda/map' ||
       v.muType === 'rda/list');
  }

  // 智能提取 schema：自动处理各种对象形态
  function extractAllSchemas(root) {
    const found = [];

    function walk(obj, path) {
      if (!obj || typeof obj !== 'object') return;

      // 如果是 MuSchema 实例本身，记录它
      if (isMuSchema(obj)) {
        found.push({ path, type: 'schema', schema: obj });
        return;
      }

      // 如果是 protocol 定义体 { client: {...}, server: {...} }
      if (isProtocolDef(obj)) {
        found.push({ path, type: 'protocol', schema: obj });
        return;
      }

      // 如果是 MuClient 或 MuServer
      if (obj.protocols && Array.isArray(obj.protocols)) {
        for (let i = 0; i < obj.protocols.length; i++) {
          const p = obj.protocols[i];
          if (p && p.schema) {
            found.push({ path: `${path}.protocols[${i}]`, type: 'protocol', schema: p.schema });
          }
        }
        return;
      }

      // 如果是 MuRDA
      if (isRDA(obj)) {
        found.push({ path, type: 'rda', schema: obj });
        return;
      }

      // 如果是数组，遍历元素
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          walk(obj[i], `${path}[${i}]`);
        }
        return;
      }

      // 普通对象：遍历所有属性，但限制深度
      if (path.split('.').length > 8) return; // 防止无限递归

      for (const key of Object.keys(obj)) {
        try {
          walk(obj[key], `${path}.${key}`);
        } catch (e) {
          // 跳过不可访问的属性
        }
      }
    }

    walk(root, 'root');
    return found;
  }

  // ---------- 递归提取 Schema 的纯数据描述 ----------
  function describeSchema(schema) {
    if (!schema || typeof schema !== 'object') return { type: 'unknown', raw: schema };

    const type = schema.muType;

    switch (type) {
      // 原始类型
      case 'void':
      case 'boolean':
      case 'int8':   case 'int16':   case 'int32':
      case 'uint8':  case 'uint16':  case 'uint32':
      case 'float32': case 'float64':
      case 'varint': case 'rvarint':
      case 'ascii':  case 'utf8':
      case 'bytes':  case 'date':    case 'json':
        return { type };

      case 'fixed-ascii':
        return { type, length: schema.muData?.length };

      case 'quantized-float':
        return { type, ...schema.muData };

      // 容器类型
      case 'struct': {
        const fields = {};
        if (schema.muData && typeof schema.muData === 'object') {
          for (const [key, val] of Object.entries(schema.muData)) {
            fields[key] = describeSchema(val);
          }
        }
        return { type, fields };
      }

      case 'union': {
        const variants = {};
        if (schema.muData && typeof schema.muData === 'object') {
          for (const [key, val] of Object.entries(schema.muData)) {
            variants[key] = describeSchema(val);
          }
        }
        return { type, variants };
      }

      case 'array':
      case 'sorted-array':
        return { type, element: describeSchema(schema.muData) };

      case 'option':
      case 'nullable':
        return { type, inner: describeSchema(schema.muData) };

      case 'dictionary':
        return { type, value: describeSchema(schema.muData) };

      case 'vector': {
        const d = schema.muData || {};
        return { type, elementType: d.type, dimension: d.dimension };
      }

      // 点猫自定义类型
      case 'quantized-vec3': {
        const d = schema.muData || {};
        return { type, precision: d.precision, identity: d.identity };
      }
      case 'quantized-vec2': {
        const d = schema.muData || {};
        return { type, precision: d.precision, identity: d.identity };
      }
      case 'cube-axis':
        return { type };

      // RDA 类型
      case 'rda/constant':
      case 'rda/register':
      case 'rda/struct':
      case 'rda/map':
      case 'rda/list':
        return describeRDA(schema);

      default:
        return { type, raw: String(schema), muData: schema.muData };
    }
  }

  function describeRDA(rda) {
    const type = rda.muType;
    const info = { type, rda: true };
    // RDA 的 schema 属性保存内部类型信息
    // MuRDA 有 stateSchema / actionSchema / storeSchema
    // MuRDARegister 包装了一个值 schema
    // MuRDAStruct 组合了多个 RDA
    // MuRDAMap 和 MuRDAList 有更复杂的内置结构
    try {
      if (rda.stateSchema) info.stateSchema = describeSchema(rda.stateSchema);
    } catch (e) { /* ignore */ }
    try {
      if (rda.actionSchema) info.actionSchema = describeSchema(rda.actionSchema);
    } catch (e) { /* ignore */ }
    // 尝试提取内部 data
    if (rda.muData && typeof rda.muData === 'object') {
      info.muData = {};
      for (const [k, v] of Object.entries(rda.muData)) {
        if (v && typeof v === 'object' && v.muType) {
          info.muData[k] = describeSchema(v);
        } else {
          info.muData[k] = v;
        }
      }
    }
    return info;
  }

  // ---------- 生成可复现的 TS 代码 ----------
  function generateCode(schema, indent = '  ') {
    if (!schema || typeof schema !== 'object') return '/* ??? */';

    const t = schema.type;

    // 原始类型
    const primitives = {
      void: 'MuVoid', boolean: 'MuBoolean',
      int8: 'MuInt8', int16: 'MuInt16', int32: 'MuInt32',
      uint8: 'MuUint8', uint16: 'MuUint16', uint32: 'MuUint32',
      float32: 'MuFloat32', float64: 'MuFloat64',
      varint: 'MuVarint', 'rvarint': 'MuRelativeVarint',
      ascii: 'MuASCII', utf8: 'MuUTF8',
      bytes: 'MuBytes', date: 'MuDate', json: 'MuJSON',
    };
    if (primitives[t]) return `new ${primitives[t]}()`;

    if (t === 'fixed-ascii') return `new MuFixedASCII(${schema.length})`;
    if (t === 'quantized-float') {
      const { type, ...rest } = schema;
      return `new MuQuantizedFloat(${JSON.stringify(rest)})`;
    }

    if (t === 'struct') {
      if (!schema.fields || !Object.keys(schema.fields).length) return `new MuStruct({})`;
      const inner = Object.entries(schema.fields).map(([k, v]) => {
        return `${indent}  ${k}: ${generateCode(v, indent + '  ')}`;
      });
      return `new MuStruct({\n${inner.join(',\n')}\n${indent}})`;
    }

    if (t === 'union') {
      if (!schema.variants || !Object.keys(schema.variants).length) return `new MuUnion({})`;
      const inner = Object.entries(schema.variants).map(([k, v]) => {
        return `${indent}  ${k}: ${generateCode(v, indent + '  ')}`;
      });
      return `new MuUnion({\n${inner.join(',\n')}\n${indent}})`;
    }

    if (t === 'array') return `new MuArray(${generateCode(schema.element, indent)})`;
    if (t === 'sorted-array') return `new MuSortedArray(${generateCode(schema.element, indent)})`;
    if (t === 'option') return `new MuOption(${generateCode(schema.inner, indent)})`;
    if (t === 'nullable') return `new MuNullable(${generateCode(schema.inner, indent)})`;
    if (t === 'dictionary') return `new MuDictionary(${generateCode(schema.value, indent)})`;
    if (t === 'vector') return `new MuVector('${schema.elementType}', ${schema.dimension})`;

    // 自定义类型
    if (t === 'quantized-vec3') {
      return `new MuQuantizedVec3(${JSON.stringify(schema.precision)}, ${JSON.stringify(schema.identity)})`;
    }
    if (t === 'quantized-vec2') {
      return `new MuQuantizedVec2(${JSON.stringify(schema.precision)}, ${JSON.stringify(schema.identity)})`;
    }
    if (t === 'cube-axis') return `new MuCubeAxis()`;

    if (schema.rda) {
      return generateRDACode(schema, indent);
    }

    return `/* 未识别的类型: ${t} */ null`;
  }

  function generateRDACode(info, indent) {
    const t = info.type;
    switch (t) {
      case 'rda/register':
        if (info.stateSchema) {
          return `new MuRDARegister(${generateCode(info.stateSchema, indent)})`;
        }
        return '/* MuRDARegister(?) */';
      case 'rda/constant':
        return `new MuRDAConstant(${generateCode(info.stateSchema, indent)})`;
      case 'rda/struct': {
        if (info.muData && typeof info.muData === 'object') {
          const inner = Object.entries(info.muData).map(([k, v]) => {
            const code = generateCode(v, indent + '  ');
            return `${indent}  ${k}: ${code}`;
          });
          return `new MuRDAStruct({\n${inner.join(',\n')}\n${indent}})`;
        }
        return '/* MuRDAStruct(?) */';
      }
      case 'rda/map':
        return `/* MuRDAMap: 需从 data schema 推断 */`;
      case 'rda/list':
        return `/* MuRDAList: 需从 data schema 推断 */`;
      default:
        return `/* RDA: ${t} */`;
    }
  }

  // ---------- 收集 import ----------
  function collectImports(schema, imports) {
    if (!schema || typeof schema !== 'object') return;
    const t = schema.type;

    const primitiveImportMap = {
      void: 'MuVoid', boolean: 'MuBoolean',
      int8: 'MuInt8', int16: 'MuInt16', int32: 'MuInt32',
      uint8: 'MuUint8', uint16: 'MuUint16', uint32: 'MuUint32',
      float32: 'MuFloat32', float64: 'MuFloat64',
      varint: 'MuVarint', rvarint: 'MuRelativeVarint',
      ascii: 'MuASCII', utf8: 'MuUTF8',
      bytes: 'MuBytes', date: 'MuDate', json: 'MuJSON',
    };

    if (primitiveImportMap[t]) imports.add(primitiveImportMap[t]);
    else if (t === 'fixed-ascii') imports.add('MuFixedASCII');
    else if (t === 'quantized-float') imports.add('MuQuantizedFloat');
    else if (t === 'struct') imports.add('MuStruct');
    else if (t === 'union') imports.add('MuUnion');
    else if (t === 'array') imports.add('MuArray');
    else if (t === 'sorted-array') imports.add('MuSortedArray');
    else if (t === 'option') imports.add('MuOption');
    else if (t === 'nullable') imports.add('MuNullable');
    else if (t === 'dictionary') imports.add('MuDictionary');
    else if (t === 'vector') imports.add('MuVector');

    if (schema.rda) {
      const rdaImportMap = {
        'rda/register': 'MuRDARegister',
        'rda/constant': 'MuRDAConstant',
        'rda/struct': 'MuRDAStruct',
        'rda/map': 'MuRDAMap',
        'rda/list': 'MuRDAList',
      };
      if (rdaImportMap[t]) imports.add(rdaImportMap[t]);
    }

    // 自定义类型
    if (t === 'quantized-vec3') imports.add('MuQuantizedVec3');
    if (t === 'quantized-vec2') imports.add('MuQuantizedVec2');
    if (t === 'cube-axis') imports.add('MuCubeAxis');

    // 递归收集
    if (schema.fields) {
      for (const v of Object.values(schema.fields)) collectImports(v, imports);
    }
    if (schema.variants) {
      for (const v of Object.values(schema.variants)) collectImports(v, imports);
    }
    if (schema.element) collectImports(schema.element, imports);
    if (schema.inner) collectImports(schema.inner, imports);
    if (schema.value) collectImports(schema.value, imports);
    if (schema.stateSchema) collectImports(schema.stateSchema, imports);
    if (schema.actionSchema) collectImports(schema.actionSchema, imports);
    if (schema.muData && typeof schema.muData === 'object' && !schema.rda) {
      for (const v of Object.values(schema.muData)) {
        if (v && typeof v === 'object' && v.type) collectImports(v, imports);
      }
    }
  }

  // ---------- 主输出 ----------
  function dump(root) {
    // 智能查找所有 schema/protocol/rda
    const items = extractAllSchemas(root);

    console.log('%c=== mudb Schema Dump ===%c', 'font-size:16px;font-weight:bold', '');
    console.log(`对象类型: ${root?.constructor?.name || typeof root}`);
    console.log(`找到 ${items.length} 个 Schema/Protocol/RDA 定义`);

    if (items.length === 0) {
      console.log('%c\n⚠️  没有找到任何 mudb schema 定义。', 'color:#FF9800;font-size:14px');
      console.log('你传入的对象结构可能是:', Object.keys(root).slice(0, 20));
      console.log('试试更具体的子路径，例如 window.__mudb.someProperty');
      return;
    }

    let protocolIndex = 0;
    const codeBlocks = [];
    for (const item of items) {
      const { path, type, schema } = item;

      if (type === 'protocol') {
        console.log(`%c\n╔══════════════════════════════════════╗`, 'color:#888');
        console.log(`%c║  Protocol [${protocolIndex}] ${(schema.name || path).padEnd(26)}║`, 'color:#888;font-weight:bold');
        console.log(`%c╚══════════════════════════════════════╝`, 'color:#888');
        const code = getProtocolCode(schema, protocolIndex);
        codeBlocks.push(code);
        protocolIndex++;
      } else if (type === 'schema') {
        console.log(`%c\n▸ Schema at ${path}%c`, 'color:#9C27B0', '');
        console.log(describeSchema(schema));
      } else if (type === 'rda') {
        console.log(`%c\n▸ RDA at ${path}%c`, 'color:#E91E63', '');
        console.log(describeSchema(schema));
      }
    }

    // ---------- 输出全部可复制的代码 ----------
    if (codeBlocks.length > 0) {
      console.log('%c\n═══════════════════════════════════════════', 'color:#FF9800;font-size:14px;font-weight:bold');
      console.log('%c  🎯 完整协议定义代码（复制下面全部）', 'color:#FF9800;font-size:14px;font-weight:bold');
      console.log('%c═══════════════════════════════════════════\n', 'color:#FF9800;font-size:14px;font-weight:bold');
      console.log(codeBlocks.join('\n\n'));
      console.log('%c\n═══════════════════════════════════════════', 'color:#FF9800;font-size:14px;font-weight:bold');
      console.log('%c  📋 复制上面这段，保存为 protocol.ts', 'color:#FF9800');
      console.log('%c  提示：custom-schema.ts 需要你根据 a.js/b.js/c.js 实现', 'color:#888');
      console.log('%c═══════════════════════════════════════════\n', 'color:#FF9800;font-size:14px;font-weight:bold');
    }

    // ---------- 额外信息 ----------
    if (root.bandwidth) {
      console.log('\n%c▸ Bandwidth%c', 'color:#888', '');
      console.log('发送/接收字节数:', root.bandwidth);
    }
    if (root.sessionId) {
      console.log('\n%c▸ Session ID: %c' + root.sessionId, 'color:#888', 'color:#4CAF50');
    }

    console.log('\n%c========== Dump Complete ==========%c', 'font-size:14px;font-weight:bold', '');
  }

  // ---------- 生成单个 protocol 的代码（纯文本） ----------
  function getProtocolCode(schema, index) {
    const allImports = new Set();
    const name = schema.name || `protocol_${index}`;

    // 收集 Schema 信息（只为了收集 import）
    const clientEntries = [];
    if (schema.client && typeof schema.client === 'object') {
      for (const [msgName, msgSchema] of Object.entries(schema.client)) {
        if (isMuSchema(msgSchema)) {
          const desc = describeSchema(msgSchema);
          collectImports(desc, allImports);
          clientEntries.push([msgName, msgSchema]);
        }
      }
    }
    const serverEntries = [];
    if (schema.server && typeof schema.server === 'object') {
      for (const [msgName, msgSchema] of Object.entries(schema.server)) {
        if (isMuSchema(msgSchema)) {
          const desc = describeSchema(msgSchema);
          collectImports(desc, allImports);
          serverEntries.push([msgName, msgSchema]);
        }
      }
    }

    // 生成代码
    const customTypes = ['MuQuantizedVec3', 'MuQuantizedVec2', 'MuCubeAxis'];
    const customImports = [...allImports].filter(x => customTypes.includes(x));
    const rdaImports = [...allImports].filter(x => x.startsWith('MuRDA') && !customTypes.includes(x));
    const normalImports = [...allImports].filter(x => !x.startsWith('MuRDA') && !customTypes.includes(x));

    const lines = [];
    if (normalImports.length > 0) {
      lines.push(`import {\n  ${normalImports.sort().join(',\n  ')}\n} from "mudb/schema"`);
    }
    if (rdaImports.length > 0) {
      lines.push(`import {\n  ${rdaImports.sort().join(',\n  ')}\n} from "mudb/rda"`);
    }
    if (customImports.length > 0) {
      lines.push(`import {\n  ${customImports.sort().join(',\n  ')}\n} from "./custom-schema"`);
    }

    // 构建 protocol 定义体
    const jsonLike = ['{'];
    if (name) jsonLike.push(`  name: '${name}',`);
    if (clientEntries.length > 0) {
      jsonLike.push(`  client: {`);
      for (const [msgName, msgSchema] of clientEntries) {
        jsonLike.push(`    ${msgName}: ${generateCode(describeSchema(msgSchema), '    ')},`);
      }
      jsonLike.push(`  },`);
    }
    if (serverEntries.length > 0) {
      jsonLike.push(`  server: {`);
      for (const [msgName, msgSchema] of serverEntries) {
        jsonLike.push(`    ${msgName}: ${generateCode(describeSchema(msgSchema), '    ')},`);
      }
      jsonLike.push(`  },`);
    }
    jsonLike.push(`};`);

    const block = lines.length > 0
      ? lines.join('\n\n') + '\n\n' + jsonLike.join('\n')
      : jsonLike.join('\n');

    // 也 console.log 出来供查看
    console.log('\n' + block);

    return block;
  }

  // 执行
  try {
    dump(client);
  } catch (err) {
    console.error('[mudb-dump] 执行出错:', err);
    console.error(err);
    console.error('\n传入对象的 keys:', Object.keys(client).slice(0, 30));
  }
})();

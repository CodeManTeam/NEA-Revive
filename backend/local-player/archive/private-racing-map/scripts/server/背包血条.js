/**
 * 物品数据表 - 包含所有物品的基础配置信息
 * @constant {Object} ITEM_DATA
 */

/**
 * 游戏物品类 - 封装物品实例的属性和方法
 *
 * @class GameItem
 * @property {number} id - 物品唯一ID
 * @property {number} num - 当前堆叠数量
 * @property {string} hash - 防伪哈希码
 * @property {number} type - 物品类型(0:其他,1:方块,2:工具,3:装备,4:消耗品)
 * @property {number} maxstack - 最大堆叠数量
 * @property {number|null|undefined} durability - 当前耐久度(仅装备/工具有效)
 * @property {Array<Enchantment>} enchantment - 附魔效果列表
 * @property {string|null} equipmentType - 装备类型(armor系)
 * @property {Array} effects - 特殊效果(消耗品/药水等)
 * @property {Object} data - 物品基础数据
 */
class GameItem {
    id;
    num;
    hash;
    type;
    maxstack;
    durability;
    enchantment;
    equipmentType;
    effects;
    data;
    /**
     * 创建物品实例
     * @param {number} id - 物品ID，必须存在于ITEM_DATA中
     * @param {number} [num=1] - 初始数量，会自动限制在最大堆叠数内
     * @param {Item} [options] - 物品配置选项
     * @param {string} [options.hash] - 自定义防伪哈希码(不提供则自动生成)
     * @param {number} [options.durability] - 自定义耐久度(覆盖默认值)
     * @param {Array} [options.enchantment] - 自定义附魔效果
     * @throws {Error} 如果物品ID无效会抛出错误
     */
    constructor(id, num = 1, { hash, durability, enchantment } = {}) {
        if (!ITEM_DATA[id]) {
            throw new Error(`Invalid item ID: ${id}`);
        }
        // 从全局配置获取物品数据
        const data = ITEM_DATA[id] || {};
        /**
         * 物品唯一标识符
         * @type {number}
         */
        this.id = id;
        /**
         * 当前堆叠数量(自动限制在最大堆叠数内)
         * @type {number}
         */
        this.num = Math.min(Math.max(1, num), data.maxstack || 1);
        /**
         * 防伪哈希码(防止物品复制漏洞)
         * @type {string}
         */
        this.hash = hash || this._generateHash();
        /**
         * 物品类型:
         * 0-其他, 1-方块, 2-工具, 3-装备, 4-消耗品
         * @type {number}
         */
        this.type = data.type || 0;
        /**
         * 最大堆叠数量
         * @type {number}
         */
        this.maxstack = data.maxstack || 1;
        /**
         * 当前耐久度(仅装备/工具有效)
         * @type {number|null}
         */
        this.durability = durability !== undefined ? durability :
            data.durability !== undefined ? data.durability :
                undefined;
        /**
         * 附魔效果列表
         * @type {Array}
         */
        this.enchantment = enchantment ? [...enchantment] : [];
        /**
         * 装备类型(armor系)
         * @type {string|null}
         */
        this.equipmentType = data.equipmentType || '';
        /**
         * 特殊效果(消耗品/药水等)
         * @type {Array}
         */
        this.effects = data.effects ? [...data.effects] : [];
        /**
         * 物品基础数据
         * @type {Object}
         */
        this.data = data;
    }
    /**
     * 生成防伪哈希码(私有方法)
     * @private
     * @returns {string} 基于时间和随机数的哈希字符串
     */
    _generateHash() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    /**
     * 判断是否可堆叠
     * @returns {boolean} 可堆叠返回true
     */
    isStackable() {
        return this.maxstack > 1 && this.type !== 3; // 装备类不可堆叠
    }
    /**
     * 创建当前物品的深拷贝
     * @returns {GameItem} 新物品实例
     */
    clone() {
        return new GameItem(this.id, this.num, {
            hash: this.hash,
            durability: this.durability !== null ? this.durability : undefined,
            enchantment: [...this.enchantment]
        });
    }
}
globalThis.GameItem = GameItem;
/**
 * 装备槽位类型
 * @typedef {'helmet'|'chestplate'|'leggings'|'boots'} EquipmentSlot
 */
/**
 * 装备事件数据接口
 * @interface EquipmentEventData
 * @property {EquipmentSlot} slotType - 装备槽位类型
 * @property {GameItem|null} item - 相关物品
 */
/**
 * 装备管理系统 - 管理玩家装备的穿戴和属性变化
 *
 * @class EquipmentSlots
 * @property {Object.<EquipmentSlot, GameItem|null>} slots - 装备槽位映射
 * @property {Object.<string, Function[]>} listeners - 事件监听器映射
 */
class EquipmentSlots {
    /**
     * 装备槽位存储
     * @type {Object.<EquipmentSlot, GameItem|null>}
     */
    slots;
    /**
     * 事件监听器列表
     * @type {Object.<string, Function[]>}
     */
    listeners;
    constructor() {
        /**
         * 装备槽位初始化:
         * - helmet: 头盔槽
         * - chestplate: 胸甲槽
         * - leggings: 护腿槽
         * - boots: 靴子槽
         */
        this.slots = {
            helmet: null,
            chestplate: null,
            leggings: null,
            boots: null,
        };
        /**
         * 事件监听器初始化:
         * - equip: 装备事件
         * - unequip: 卸下事件
         * - break: 装备损坏事件
         */
        this.listeners = {
            'equip': [],
            'unequip': [],
            'break': []
        };
    }
    /**
     * 尝试装备物品
     * @param {GameItem} item - 要装备的物品
     * @returns {GameItem|null} 被替换的装备，如果没有被替换的装备则返回null，失败返回null
     */
    equip(item) {
        // 验证是否为有效装备
        if (!item.equipmentType || !this.slots.hasOwnProperty(item.equipmentType)) {
            return null;
        }
        const slotType = item.equipmentType;
        const previousItem = this.slots[slotType];
        // 执行装备替换
        this.slots[slotType] = item.clone();
        // 触发装备事件
        this._triggerEvent('equip', { slotType, item });
        // 如果有被替换的装备，触发卸下事件
        if (previousItem) {
            this._triggerEvent('unequip', { slotType, item: previousItem });
            return previousItem;
        }
        return null;
    }
    /**
     * 应用耐久损耗
     * @param {string} slotType - 装备槽位类型
     * @param {number} amount - 损耗值
     */
    applyDamage(slotType, amount) {
        const item = this.slots[slotType];
        if (!item || !item.durability)
            return;
        // 计算新耐久并更新
        if (item.durability != null) {
            item.durability = Math.max(0, item.durability - amount);
        }
        // 耐久耗尽处理
        if (item.durability === 0) {
            this.slots[slotType] = null;
            this._triggerEvent('break', { slotType, item });
        }
    }
    /**
     * 添加事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        // 如果事件监听器中存在指定事件
        if (this.listeners[event]) {
            // 将回调函数添加到该事件的监听器中
            this.listeners[event].push(callback);
        }
    }
    /**
     * 触发事件(私有方法)
     * @private
     * @param {string} event - 事件名称
     * @param {Object} data - 事件数据
     */
    _triggerEvent(event, data) {
        // 遍历事件监听器数组
        this.listeners[event].forEach(cb => {
            // 执行监听器回调函数，并传入数据
            cb(data);
        });
    }
}
/**
 * 背包事件数据接口
 * @interface InventoryEventData
 * @property {number} id - 物品ID
 * @property {number} count - 物品数量
 * @property {number} [index] - 槽位索引(可选)
 */
/**
 * 背包系统主类 - 管理玩家物品存储和装备
 *
 * @class Inventory
 * @property {number} size - 背包总格数
 * @property {GameItem[]} slots - 物品槽数组
 * @property {GameItem[]} craft - 合成槽数组
 * @property {EquipmentSlots} equipment - 装备管理系统
 * @property {number} selectedHotbar - 当前选中的快捷栏位(0-8)
 * @property {Object.<string, Function[]>} listeners - 事件监听器
 */

class Inventory {
    /** 背包总格数 */
    size;
    /** 物品槽数组 */
    slots;
    /** 合成槽数组 */
    craft;
    /** 装备管理系统 */
    equipment;
    /** 当前选中的快捷栏位(0-8) */
    selectedHotbar;
    /** 事件监听器 */
    listeners;
    /**
     * 初始化背包系统
     * @param {number} [size=36] - 背包总容量(必须≥9)
     * @throws {Error} 当size小于9时抛出错误
     */
    constructor(size = 36) {
        if (size < 9) {
            throw new Error("Inventory size must be at least 9");
        }
        /**
         * 背包总格数
         * @type {number}
         */
        this.size = size;
        /**
         * 物品槽数组(初始化为空物品)
         * @type {GameItem[]}
         */
        this.slots = Array(size).fill(null).map(() => new GameItem(0));
        /**
         * 合成槽数组(5个槽位)
         * @type {GameItem[]}
         */
        this.craft = Array(5).fill(null).map(() => new GameItem(0));
        /**
         * 装备管理系统实例
         * @type {EquipmentSlots}
         */
        this.equipment = new EquipmentSlots();
        /**
         * 当前选中的快捷栏位(0-8)
         * @type {number}
         */
        this.selectedHotbar = 0;
        /**
         * 事件监听器
         * @type {Object.<string, Function[]>}
         */
        this.listeners = {
            'add-item': [],
            'remove-item': [],
            'hotbar-change': []
        };
    }
    /**
     * 批量添加物品(核心方法)
     * @param {number} id - 物品ID
     * @param {number} num - 添加数量
     * @param {Object} [options] - 额外选项
     * @param {number} [options.durability] - 初始耐久度
     * @param {Array} [options.enchantment] - 附魔数据
     * @param {Array} [options.ischange] - 是否替换(仅对装备有效)
     * @returns {number} 剩余未放入的数量
     */
    pile(id, num, options = { ischange: false }) {
        // 验证物品有效性
        if (!ITEM_DATA[id])
            return "⚠ 该物品不存在";
        let remaining = num;
        const baseItem = new GameItem(id, 1, options);
        // 验证是否有options参数
        if (!options) {
            return "⚠ 请提供options参数";
        }
        ;
        // 优先尝试装备(如果是可装备物品)
        if (baseItem.type === 3 && options.ischange !== false) {
            const equipResult = this.equipment.equip(baseItem);
            if (equipResult !== null) {
                remaining -= 1;
                this._triggerEvent('add-item', { id, count: 1 }); // 触发事件
                if (equipResult) {
                    const durability = equipResult.durability !== null ? equipResult.durability : undefined;
                    this.pile(equipResult.id, 1, { durability, enchantment: equipResult.enchantment, ischange: false });
                }
                if (remaining === 0)
                    return 0;
            }
        }
        // 堆叠处理(可堆叠物品)
        if (baseItem.isStackable()) {
            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                if (slot.id === id && slot.num < slot.maxstack) {
                    const availableSpace = slot.maxstack - slot.num;
                    const addAmount = Math.min(availableSpace, remaining);
                    slot.num += addAmount;
                    remaining -= addAmount;
                    this._triggerEvent('add-item', { id, count: addAmount, index: i });
                    if (remaining === 0)
                        return 0;
                }
            }
        }
        // 寻找空位放置剩余物品
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].id === 0) {
                const addAmount = Math.min(remaining, baseItem.maxstack);
                this.slots[i] = new GameItem(id, addAmount, options);
                remaining -= addAmount;
                this._triggerEvent('add-item', { id, count: addAmount, index: i });
                if (remaining === 0)
                    return 0;
            }
        }
        return remaining;
    }
    /**
     * 获取当前快捷栏选中物品
     * @returns {GameItem} 当前手持物品
     */
    getSelectedItem() {
        // 计算热键栏索引
        const hotbarIndex = this.size - 9 + this.selectedHotbar;
        // 返回指定索引处的槽位
        return this.slots[hotbarIndex];
    }
    /**
     * 快捷栏切换
     * @param {number} index - 新选择的位置(0-8)
     */
    selectHotbar(index) {
        // 计算新的索引值，确保索引值在0到8之间
        const newIndex = Math.max(0, Math.min(index, 8));
        // 如果新的索引值不等于当前选中的热键栏索引
        if (newIndex !== this.selectedHotbar) {
            // 更新当前选中的热键栏索引
            this.selectedHotbar = newIndex;
            // 触发热键栏变化事件
            this._triggerEvent('hotbar-change', { index: newIndex });
        }
    }
    get durabilityPercentage() {
        const item = this.getSelectedItem();
        // 如果当前物品没有耐久度属性，则返回0
        if (!item.durability)
            return 0;
        // 从物品数据表中获取当前物品ID对应的最大耐久度，如果没有则默认为1
        const max = ITEM_DATA[item.id]?.durability || 1;
        // 计算当前耐久度占最大耐久度的百分比，并四舍五入到最近的整数
        return Math.round((item.durability / max) * 100);
    }
    sortByType() {
        // 对slots数组进行排序
        this.slots.sort((a, b) => {
            // 优先按类型排序，其次按ID
            // 返回值为负数、零或正数，分别表示a排在b之前、a与b相等或a排在b之后
            // 首先比较类型，如果类型不同，则按类型排序
            // 如果类型相同，则比较ID，按ID排序
            return a.type - b.type || a.id - b.id;
        });
        // 触发reorganize事件，传递空对象作为参数
        this._triggerEvent('reorganize', {});
    }
    getSyncData() {
        // 返回包含slots和equipment.slots的对象
        return {
            // 返回当前实例的slots属性
            slots: this.slots,
            // 返回当前实例的equipment对象的slots属性
            equipment: this.equipment.slots,
        };
    }
    /**
     * 添加事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        // 如果listeners对象中已存在该事件
        if (this.listeners[event]) {
            // 将回调函数添加到该事件的回调数组中
            this.listeners[event].push(callback);
        }
    }
    /**
     * 触发事件(私有方法)
     * @private
     * @param {string} event - 事件名称
     * @param {Object} data - 事件数据
     */
    _triggerEvent(event, data) {
        // 遍历当前事件的监听器数组
        this.listeners[event].forEach(cb => {
            // 对每个监听器执行回调函数，并传入数据参数
            cb(data);
        });
    }
}

globalThis.Inventory = Inventory;


/* unused harmony exports dis, voxel_type, tips, treetype, dmgTypeLable, MinecraftData */
// 导出常量数据

// 全局导出
const MinecraftData = {
    dis,
    admin,
    voxel_type,
    tips,
    treetype,
    dmgTypeLable,
    ITEM_DATA,
    block
};

class GameBlock {
    id;
    type;
    name;
    usename;
    boxid;
    space;
    box;
    model;
    constructor(config) {
        this.id = config?.id ?? 0;
        this.type = config?.type ?? block[`${this.id}`].type;
        this.boxid = config?.boxid ?? block[`${this.id}`].boxid;
        this.space = config?.space ?? block[`${this.id}`].space;
        this.box = config?.box ?? block[`${this.id}`].box;
        this.model = config?.model ?? block[`${this.id}`].model;
    }
    copy(id) {
        this.id = id;
        this.type = block[`${this.id}`].type;
        this.boxid = block[`${this.id}`].boxid;
        this.space = block[`${this.id}`].space;
        this.box = block[`${this.id}`].box;
        this.model = block[`${this.id}`].model;
    }
}
;
async function generateMapArray() {
    return [];
    const map = [];
    for (let x = 0; x <= world.size.x; ++x) {
        map.push([]);
        for (let y = 0; y <= world.size.y; ++y) {
            map[x].push([]);
            for (let z = 0; z <= world.size.z; ++z) {
                if (y >= 28 && y <= 108) {
                    map[x][y].push(Reflect.construct(GameBlock, []));
                };
            }
            ;
        }
        ;
        await sleep(1 / 5);
    }
    ;
    return map;
}
class GameBlocks {
    block;
    init;
    map;
    monotone;
    block_falling;
    preprocessing;
    constructor(config) {
        this.block = config?.block ?? block;
        this.init = false;
        this.map = new Array();
        generateMapArray().then(result => {
            this.map = result;
            this.init = true;
            init_total();
        });
        this.monotone = false;
        this.block_falling = config?.block_falling ?? false;
        this.preprocessing = config?.preprocessing ?? false;
        this._range();
    }
    /**
     * @desc 判断位置是否在范围内
     * @param {Number} x 坐标 x
     * @param {Number} y 坐标 y
     * @param {Number} z 坐标 z
     * @author SpiritualRealm
     */
    inScope(x = 0, y = 0, z = 0) {
        if (!this.init || !(y >= 28 && y <= 108)) {
            return;
        }
        ;
        return ((x >= 0 && x <= world.size.x) && (y >= 0 && y <= world.size.y) && (z >= 0 && z <= world.size.z));
    }
    /**
     * @desc 通过ID放置方块
     * @param {Number} x 放置坐标 x
     * @param {Number} y 放置坐标 y
     * @param {Number} z 放置坐标 z
     * @param {Number|String} type 放置方块所对应的命名空间ID
     * @param {JSON} options {Number} rotation 放置方块的旋转码 {Boolean} fix 方块是否固定
     * @author SpiritualRealm
     */
    setBlockId(x = 0, y = 0, z = 0, type = 0, options = { rotation: undefined, fix: undefined, count: undefined }) {
        if (!this.init) {
            return;
        }
        ;
        x = Math.round(x), y = Math.round(y), z = Math.round(z); // 整理坐标参数
        if (isNaN(options.rotation)) {
            options.rotation = 0;
        }
        ;
        if (isNaN(options.fix)) {
            options.fix = false;
        }
        ;
        if (!this.inScope(x, y, z) || !([0, 1, 2, 3, undefined].includes(options.rotation)) || !([true, false, undefined].includes(options.fix)))
            return 0; // 判断参数是否合法
        let id = 0, last_id = 0;
        if ((typeof type) == "number") {
            id = type, last_id = this.map[x][y][z].id;
        }
        else {
            return 0;
        }
        if (id == 7) {
            this.map[x][y][z].boxid == 7
            return;
        };
        if (this.map[x][y][z].id == id && this.map[x][y][z].type == 5) { // 判断是否需要操作
            null;
        }
        else if (this.map[x][y][z].id != id) {
            try {
                for (let _x = x; _x <= x - 1 + this.block[`${id}`].space.x; _x++) {
                    for (let _y = y; _y <= y - 1 + this.block[`${id}`].space.y; _y++) {
                        for (let _z = z; _z <= z - 1 + this.block[`${id}`].space.z; _z++) {
                            this.map[_x][_y][_z].copy(id);
                        }
                        ;
                    }
                    ;
                }
                ;
            } catch (e) { }
        }
        else {
            return id;
        }
        ;
        if (this.preprocessing) {
            return id;
        } // 预处理状态
        switch (this.map[x][y][z].type) {
            case 0: /* 空 */
                voxels.setVoxelId(x, y, z, 0);
                if (this.block[`${last_id}`].type === 3) {
                    world.querySelectorAll(`.${x}.${y}.${z}`).forEach((entity) => {
                        entity.destroy();
                    });
                }
                ;
                if (options.count == undefined || options.count <= 16) {
                    setTimeout(() => {
                        if (this.inScope(x, y + 1, z)) {
                            if (this.block[`${this.map[x][y + 1][z].id}`].type == 5) {
                                this.setBlockId(x, y + 1, z, this.map[x][y + 1][z].id, {
                                    count: (options.count == undefined ? 0 : options.count++),
                                    rotation: 0,
                                    fix: false
                                });
                            }
                        }
                        if (this.inScope(x - 1, y, z) && this.inScope(x - 1, y - 1, z)) {
                            if (this.block[`${this.map[x - 1][y][z].id}`].type == 5) {
                                this.map[x - 1][y - 1][z].id == 0 ? this.setBlockId(x - 1, y, z, this.map[x - 1][y][z].id, {
                                    count: (options.count == undefined ? 0 : options.count++),
                                    rotation: 0,
                                    fix: false
                                }) : null;
                            }
                        }
                        if (this.inScope(x + 1, y, z) && this.inScope(x + 1, y - 1, z)) {
                            if (this.block[`${this.map[x + 1][y][z].id}`].type == 5) {
                                this.map[x + 1][y - 1][z].id == 0 ? this.setBlockId(x + 1, y, z, this.map[x + 1][y][z].id, {
                                    count: (options.count == undefined ? 0 : options.count++),
                                    rotation: 0,
                                    fix: false
                                }) : null;
                            }
                        }
                        if (this.inScope(x, y, z + 1) && this.inScope(x, y - 1, z + 1)) {
                            if (this.block[`${this.map[x][y][z + 1].id}`].type == 5) {
                                this.map[x][y - 1][z + 1].id == 0 ? this.setBlockId(x, y, z + 1, this.map[x][y][z + 1].id, {
                                    count: (options.count == undefined ? 0 : options.count++),
                                    rotation: 0,
                                    fix: false
                                }) : null;
                            }
                        }
                        if (this.inScope(x, y, z - 1) && this.inScope(x, y - 1, z - 1)) {
                            if (this.block[`${this.map[x][y][z - 1].id}`].type == 5) {
                                this.map[x][y - 1][z - 1].id == 0 ? this.setBlockId(x, y, z - 1, this.map[x][y][z - 1].id, {
                                    count: (options.count == undefined ? 0 : options.count++),
                                    rotation: 0,
                                    fix: false
                                }) : null;
                            }
                        }
                    }, 120);
                }
                ;
                break;
            case 1: /* 流体 */
                voxels.setVoxelId(x, y, z, 364);
                this.monotone ? voxels.setVoxel(x, y, z, "white") : null;
                break;
            case 2: /* 具有GameVoxel类所直接对应的方块 */
                voxels.setVoxel(x, y, z, this.map[x][y][z].boxid, options.rotation);
                this.monotone ? voxels.setVoxel(x, y, z, "white") : null;
                break;
            case 3: /* 仅有模型实体的方块 */
                const mesh = this.map[x][y][z].model;
                voxels.setVoxelId(x, y, z, 0);
                this.monotone ? voxels.setVoxel(x, y, z, "white") : null;
                const e = world.createEntity({
                    mesh: mesh,
                    collides: this.map[x][y][z].box.x == 0 && this.map[x][y][z].box.y == 0 && this.map[x][y][z].box.z == 0 ? false : true,
                    fixed: true,
                    gravity: false,
                    meshScale: new GameVector3(1 / 16, 1 / 16, 1 / 16),
                    position: new GameVector3(x + 0.5, y + 0.5, z + 0.5),
                    mass: Infinity,
                    restitution: 0,
                    friction: 0,
                    tags: [`BLOCK`, `${x}.${y}.${z}`, `VOXELID::${this.map[x][y][z].id}`],
                });
                if ([0, 1, 2, 3].includes(options.rotation) && options.rotation && e) {
                    e.meshOrientation.copy(new GameQuaternion(0, options.rotation == 0 ? 1 : options.rotation == 2 ? 0 : 0.707, 0, options.rotation % 2 == 0 ? 0 : options.rotation == 1 ? -0.707 : 0.707));
                    e._r = options.rotation;
                }
                ;
                break;
            case 4: /* 使用屏障方块作为碰撞箱 以模型作为贴图的方块 */
                break;
            case 5: /* 可能掉落的方块 */
                if (this.block_falling) { //是否允许方块掉落
                    if (this.map[x][y - 1][z].id != 0) {
                        voxels.setVoxel(x, y, z, this.map[x][y][z].boxid, options.rotation);
                        this.monotone ? voxels.setVoxel(x, y, z, "white") : null;
                    }
                    else {
                        const mesh = this.map[x][y][z].model;
                        blocks.setBlockId(x, y, z, 0);
                        const entity = world.createEntity({
                            mesh: mesh,
                            collides: true,
                            fixed: false,
                            gravity: true,
                            meshScale: new GameVector3(1 / 16, 1 / 16, 1 / 16),
                            position: new GameVector3(x + 0.5, y + 0.5, z + 0.5),
                            mass: Infinity,
                            restitution: 0,
                            friction: 1,
                            tags: [`Falling_block`],
                            velocity: new GameVector3(0, 1, 0),
                        });
                        if (entity) {
                            entity.block = type; // 修复类型错误
                            entity.real_position = { x: x + 0.5, y: y, z: z + 0.5 };
                        }
                        ;
                    }
                }
                else {
                    voxels.setVoxel(x, y, z, this.map[x][y][z].boxid, (options.rotation == undefined ? 0 : options.rotation));
                    this.monotone ? voxels.setVoxel(x, y, z, "white") : null;
                }
                ;
                break;
            case 6: /* 其他类型 */
                break;
            default:
                break;
        }
        ;
        return id;
    }
    /**
     * @desc 获取方块ID
     * @param {Number} x 指向坐标 x
     * @param {Number} y 指向坐标 y
     * @param {Number} z 指向坐标 z
     * @author SpiritualRealm
     */
    getBlockId(x, y, z) {
        return voxels.getVoxelId(x, y, z);
        if (!this.init) {
            return;
        }
        ;
        x = Math.round(x), y = Math.round(y), z = Math.round(z);
        if (!this.inScope(x, y, z)) {
            return 0;
        }
        ;
        return this.map[x][y][z].id;
    }
    _range() {
        setInterval(async () => {
            world.querySelectorAll(".Falling_block").forEach((entity) => {
                if (entity.position.y < 0 || entity.destroyed) {
                    entity.destroy();
                    return;
                }
                entity.real_position = { x: 2 * entity.real_position.x - entity.position.x, y: entity.position.y, z: 2 * entity.real_position.z - entity.position.z };
                entity.velocity.x = entity.velocity.z = 0;
                entity.position.x = Math.round(entity.real_position.x - 0.5) + 0.5;
                entity.position.z = Math.round(entity.real_position.z - 0.5) + 0.5;
                if ((entity.velocity.y <= 0.015 && entity.velocity.y >= -0.015) && this.map[Math.round(entity.position.x - 0.5)][Math.ceil(entity.position.y - 1.5)][Math.round(entity.position.z - 0.5)].id != 0) {
                    entity.collides = false;
                    entity.fixed = true;
                    this.setBlockId(entity.position.x - 0.5, entity.position.y - 0.5, entity.position.z - 0.5, entity.block); // 修复参数类型错误
                    entity.destroy();
                }
                else {
                    entity.fixed = false;
                }
                ;
            });
        }, 4);
    }
}
;
async function init_total() {
    for (let x = 0; x < 256; x++) {
        for (let y = 63; y < 100; y++) {
            for (let z = 0; z < 256; z++) {
                voxels.getVoxelId(x, y, z) !== 0 ? blocks.setBlockId(x, 0, z, 7) : null;
            };
        };
    }
    ;
}
;
globalThis.blocks = Reflect.construct(GameBlocks, []);

class GameMoment {
    time;
    interval;
    listeners;
    moment;
    constructor(time = 0) {
        this.time = time;
        this.interval = 20;
        this.moment = 0;
        /** @member {Array} 事件监听器列表 */
        this.listeners = {
            'onMoment': [],
        };
    }
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    /**
     * 触发事件(私有方法)
     * @private
     * @param {string} event - 事件名称
     * @param {Object} data - 事件数据
     */
    _triggerEvent(event, data) {
        this.listeners[event].forEach(cb => cb(data));
    }
    getMoment() {
        return (this.time);
    }
    cancelMoment() {
        return (clearInterval(this.moment));
    }
    startMoment() {
        return (this._circulate());
    }
    _circulate() {
        return (this.moment = setInterval(() => {
            this.time++;
            this._triggerEvent('onMoment', { moment: this.time });
        }, this.interval));
    }
}
const moments = Reflect.construct(GameMoment, [0]);
moments.startMoment();

class CraftingSystem {
    recipes;
    constructor() {
        this.recipes = new Map();
    }
    _patternToKey(pattern, amounts) {
        let key = `<${pattern?.length}&${pattern[0]?.length}::|`;
        for (let r = 0; r < pattern.length; r++) {
            for (let c = 0; c < pattern[r].length; c++) {
                key += `${pattern[r][c]},${amounts[r][c]},${r},${c}|`;
            }
        }
        key += ">";
        return key;
    }
    registerRecipe(pattern, amounts, resultId, resultAmount = 1) {
        const normalized = this._normalizePattern(pattern, amounts);
        const key = this._patternToKey(normalized.pattern, normalized.amounts);
        this.recipes.set(key, {
            resultId,
            resultAmount,
            pattern: normalized.pattern,
            amounts: normalized.amounts
        });
    }
    _normalizePattern(pattern, amounts) {
        let minR = pattern.length, maxR = -1;
        let minC = pattern[0].length, maxC = -1;
        for (let r = 0; r < pattern.length; r++) {
            for (let c = 0; c < pattern[r].length; c++) {
                if (pattern[r][c] !== 0) {
                    minR = Math.min(minR, r);
                    maxR = Math.max(maxR, r);
                    minC = Math.min(minC, c);
                    maxC = Math.max(maxC, c);
                }
            }
        }
        const validPattern = [];
        const validAmounts = [];
        for (let r = minR; r <= maxR; r++) {
            const patternRow = [];
            const amountsRow = [];
            for (let c = minC; c <= maxC; c++) {
                patternRow.push(pattern[r][c]);
                amountsRow.push(amounts[r][c]);
            }
            validPattern.push(patternRow);
            validAmounts.push(amountsRow);
        }
        return { pattern: validPattern, amounts: validAmounts };
    }
    tryCraft(inputIds, inputAmounts) {
        const normalized = this._normalizePattern(inputIds, inputAmounts);
        const key = this._patternToKey(normalized.pattern, normalized.amounts);
        if (this.recipes.has(key)) {
            const recipe = this.recipes.get(key);
            return {
                resultId: recipe.resultId,
                resultAmount: recipe.resultAmount,
                consumed: recipe.amounts
            };
        }
        return 0;
    }
}
const crafting = new CraftingSystem();
const table = [
    [
        [[11]],
        [[1]],
        5, 4
    ], [
        [[18, 0, 18], [18, 18, 18], [18, 0, 18]],
        [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        14, 3
    ], [
        [[5, 5, 5], [5, 5, 5], [0, 18, 0]],
        [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        13, 3
    ], [
        [[11, 11], [11, 11]],
        [[1, 1], [1, 1]],
        18, 1
    ],
];
table.forEach((_item) => {
    crafting.registerRecipe(_item[0], _item[1], _item[2], _item[3]);
});
// const result = crafting.tryCraft(
//     [[1, 0, 0], [1, 0, 0], [0, 0, 0]],
//     [[1, 0, 0], [1, 0, 0], [0, 0, 0]]
// );
// console.log(result.resultId);

world.addCollisionFilter("player", "player");
const equipments = ["helmet", "chestplate", "leggings", "boots"];
const breaks = ["mesh/break_1.vb", "mesh/break_2.vb", "mesh/break_3.vb", "mesh/break_4.vb", "mesh/break_5.vb", "mesh/break_6.vb", "mesh/break_7.vb", "mesh/break_8.vb", "mesh/break_9.vb", "mesh/break_10.vb"];
const _distance = function (a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
};
function calculateDirection(yaw, pitch) {
    const x = Math.cos(pitch) * Math.cos(yaw);
    const y = Math.sin(pitch);
    const z = Math.cos(pitch) * Math.sin(yaw);
    return { x: (-x), y: (-y), z: (-z) };
} globalThis.calculateDirection = calculateDirection;
;
async function climb_(player) {
    world.querySelectorAll(`.VOXELID::65`).forEach(async (entity) => {
        const _climb = player.climb;
        player.climb = false;
        let playerCollisionBox = new GameBounds3(player.position.sub(player.bounds), player.position.add(new GameVector3(player.bounds.x, 0, player.bounds.z)));
        let ladderCollisionBox = new GameBounds3(entity.position.sub(new GameVector3(entity._r == 1 ? -0.5 : entity._r == 3 ? 0.5 : 0.5, entity.bounds.y, entity._r == 2 ? 0.5 : entity._r == 0 ? -0.5 : 0.5)), entity.position.add(new GameVector3(entity._r == 1 ? 0.4 : entity._r == 3 ? -0.4 : 0.5, entity.bounds.y, entity._r == 2 ? -0.4 : entity._r == 0 ? 0.4 : 0.5)));
        if (playerCollisionBox.intersects(ladderCollisionBox) && player.onjump) {
            if (!_climb || isNaN(_climb)) {
                player.climb = true;
                player.velocity.x = player.velocity.z = 0;
            }
            player.velocity.y = 0.38;
        }
        else if (playerCollisionBox.intersects(ladderCollisionBox) && !player.onjump && blocks.getBlockId(entity.position.x - 0.5, entity.position.y - 1.5, entity.position.z - 0.5) == 65) {
            if (!_climb || isNaN(_climb)) {
                player.climb = true;
                player.velocity.x = player.velocity.z = 0;
            }
            player.velocity.y = -0.3;
        }
        ;
    });
}
;
world.onPlayerLeave(async ({ entity }) => {
    entity.online = false;
});
const init_ = async ({ entity }) => {
    // 初始化UI
    remoteChannel.sendClientEvent(entity, { type: "init" });
    Object.defineProperties(entity, {
        jump_water: {
            value: 0,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        choose: {
            value: {
                index: 0,
            },
        },
        hp: { value: world.hp },
        maxHp: { value: world.hp },
        mass: { value: 0.88, },
        friction: { value: 0.08, },
        id: { value: entity.player.name, },
        enableDamage: { value: true, },
        craftings: {
            value: [
                { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
                { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
                { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
            ],
            writable: true,
            enumerable: true,
            configurable: true,
        },
        is_open: {
            value: 0,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        openBag: {
            value: async function () {
                remoteChannel.sendClientEvent(entity, { type: "open_bag", args: { bag: entity.bag } });
            },
            writable: false,
            enumerable: false,
            configurable: false,
        },
        close: {
            value: async function () {
                remoteChannel.sendClientEvent(entity, { type: "close" });
            },
            writable: false,
            enumerable: false,
            configurable: false,
        },
        hp_back: {
            value: setInterval(() => {
                !(entity.hp >= entity.maxHp) ? entity.hp += 0.5 : entity.hp = entity.maxHp;
            }, 30000),
            writable: false,
            enumerable: false,
            configurable: false,
        },
        pos_event: {
            value: setInterval(() => {
                if (entity.tPos) {
                    if (entity.ttPos) {
                        entity.ttPos.copy(entity.tPos);
                    }
                    else {
                        entity.ttPos = new GameVector3(0, 0, 0);
                    }
                    entity.tPos.copy(entity.position);
                }
                else {
                    entity.tPos = new GameVector3(0, 0, 0);
                }
            }, 50),
            writable: false,
            enumerable: false,
            configurable: false,
        },
        is_digging: {
            value: false,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        keep_mine: {
            value: true,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        onAction0: {
            value: false,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        onCrouch: {
            value: false,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        dividing_item: {
            value: false,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        online: {
            value: true,
            writable: true,
            enumerable: true,
            configurable: true,
        },
    });
    Object.defineProperties(entity.player, {
        canFly: { value: !true, },
        scale: { value: 0.8, },
        jumpPower: { value: 0.53, },
        crouchSpeed: { value: 0, },
        cameraMode: { value: "FPS", },
        cameraFovY: { value: 0.390625, },
        jumpSpeedFactor: { value: 1.7, },
        enableDoubleJump: { value: false, },
        crouchAcceleration: { value: 0.088, },
        jumpAccelerationFactor: { value: 0.6, },
        flySpeed: { value: 4, },
        flyAcceleration: { value: 4, },
        attackAble: { value: true, },
        walkAcceleration: { value: 0.1796875, },
        walkSpeed: { value: 0.1796875, },
        runSpeed: { value: 0.1796875, },
        runAcceleration: { value: 0.1796875, },
        enable3DCursor: { value: true, },
    });
    // 初始化背包系统
    Object.defineProperties(entity, {
        bag: {
            value: new Inventory(36),
            writable: true,
            enumerable: true,
            configurable: true,
        }
    });
    entity.bag.on('add-item', ({ id, count, index }) => {
        // id: 物品id, count: 物品数量, index: 放置位置(num)
        console.debug(`[Debug Item] <Get> ${entity.player.name} ID: ${id} Count: ${count} index: ${index}`);
        (entity.is_open % 2) ? remoteChannel.sendClientEvent(entity, { type: "update_bag", args: { bag: entity.bag } }) : null;
        if (index < 9) {
            remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
        }
        ;
    });
    entity.bag.on('equip', ({ slotType, item }) => {
        // slotType: 装备槽位类型, item: 装备物品(GameItem)
    });
    entity.bag.on('break', ({ slotType, item }) => {
        // slotType: 损坏槽位类型, item: 损坏物品(GameItem)
    });
    entity.player.onKeyDown(({ keyCode }) => {
        if (keyCode == entity.data.button[9]) {
            if (entity.shopOpening) {
                closeShop(entity);
                closeTeamShop(entity);
                return;
            }
            if (entity.boxOpening) {
                closeBox(entity);
                return;
            }
            (((entity.is_open++) % 2) - 1) ? (entity.openBag(), entity.bag_is_opening = 1) : (entity.close(), entity.bag_is_opening = 0);
        }
        else if (entity.data.button.slice(0, 9).includes(keyCode)) {
            const ind = entity.data.button.indexOf(keyCode);
            entity.choose.index = ind;
            remoteChannel.sendClientEvent(entity, { type: "updatehotbar_select", args: { _selection: entity.choose.index } });
            defineEntity(entity);
        }
        ;
    });
    world.onRelease(async ({ button, entity }) => {
        if (button === GameButtonType.ACTION0) {
            setTimeout(() => { entity.is_digging = false; }, 10);
            entity.onAction0 = false;
        }
        ;
        if (button === GameButtonType.JUMP) {
            entity.onjump = false;
        }
        ;
        if (button === GameButtonType.CROUCH) {
            entity.onCrouch = false;
        }
        ;
    });
    entity.addTag("break");
    entity._set = 1;
    entity._press = 0;
    entity.player.pressEvent = entity.player.onPress(async ({ button, raycast }) => {
        button != GameButtonType.JUMP && button != GameButtonType.ACTION0 && button != GameButtonType.ACTION1 ? entity._press++ : null;
        if (button === GameButtonType.JUMP) {
            entity.onjump = true;
            const __press = entity._press;
            while (entity._press == __press) {
                climb_(entity);
                await sleep(20);
            }
            ;
        }
        ;
        if (button === GameButtonType.CROUCH) {
            entity.onCrouch = true;
        }
        ;
        if (button === 'action1') {
            if (!world.gameStarting || entity.dead) return;
            const only_up = [83, 6];
            const only_on = [65];
            const __direction = calculateDirection(entity.player.cameraYaw, entity.player.cameraPitch);
            let _raycast = world.raycast(
                new GameVector3(
                    entity.position.x,
                    entity.onCrouch ? entity.position.y + 0.21875 : entity.position.y + 0.52734375,
                    entity.position.z),
                new GameVector3(
                    __direction.x, __direction.y, __direction.z
                ), {
                maxDistance: 5.5,
                ignoreFluid: true,
                ignoreEntities: false,
                ignoreSelector: ".break"
            });
            if (_raycast.hit) {
                let _v = (new GameVector3(Math.floor(_raycast.hitPosition.x + __direction.x * 0.01), Math.floor(_raycast.hitPosition.y + __direction.y * 0.01), Math.floor(_raycast.hitPosition.z + __direction.z * 0.01)));
                let __v = (new GameVector3(_raycast.hitPosition.x + __direction.x * 0.01, _raycast.hitPosition.y + __direction.y * 0.01, _raycast.hitPosition.z + __direction.z * 0.01));
                __v = __v.add(new GameVector3(_raycast.hitEntity ? -_raycast.normal.x : _raycast.normal.x, _raycast.hitEntity ? -_raycast.normal.y : _raycast.normal.y, _raycast.hitEntity ? -_raycast.normal.z : _raycast.normal.z));
                if (bcp[_v.x * 256 * 128 + _v.y * 256 + _v.z]) return;
                let v = _v.add(new GameVector3(_raycast.hitEntity ? -_raycast.normal.x : _raycast.normal.x, _raycast.hitEntity ? -_raycast.normal.y : _raycast.normal.y, _raycast.hitEntity ? -_raycast.normal.z : _raycast.normal.z));
                let xx = Math.round(__v.x), zz = Math.round(__v.z), yy = Math.round(__v.y);
                let bj = 0;
                if (Math.abs(__v.x - xx) < 0.15 && Math.abs(__v.y - yy) < 0.02) {
                    v.x = v.x + Number(Math.abs(xx - __v.x) / (xx - __v.x));
                    bj = 1;
                }
                if (Math.abs(__v.z - zz) < 0.15 && Math.abs(__v.y - yy) < 0.02) {
                    v.z = v.z + Number(Math.abs(zz - __v.z) / (zz - __v.z));
                    bj = 1;
                }
                console.log(__v.y);
                if (bj) v.y--;
                if (ITEM_DATA[entity.bag.slots[entity.choose.index].id].type == 1 && entity.bag.slots[entity.choose.index].num > 0 && ITEM_DATA[entity.bag.slots[entity.choose.index].id].block !== undefined) {
                    if (bcp[v.x * 256 * 128 + v.y * 256 + v.z]) return;
                    function pd(x, y, z) {//四周是否有方块
                        let px = [0, 0,  1, -1, 0,   0, 0];
                        let py = [0, 0,  0, 0,  1, -1, 1];
                        let pz = [1, -1, 0, 0, -1,   0, 0];
                        if (voxels.getVoxelId(x, y, z)) return 0;
                        for (let i = 0; i < px.length; i++) {
                            if (voxels.getVoxelId(x + px[i], y + py[i], z + pz[i])) return 1;
                        }
                        return 0;
                    }
                    if (!pd(v.x,v.y,v.z))return;
                    if (blocks.getBlockId(v.x, v.y, v.z) != 0) {
                        return;
                    }
                    let estPos = entity.position.add(new GameVector3(entity.velocity.x * 2,
                        (entity.velocity.y ? entity.velocity.y * 2 - 0.33 : 0), entity.velocity.z * 2));
                    let playerCollisionBox = new GameBounds3(entity.position.sub(entity.bounds),
                        entity.position.add(entity.bounds));
                    let estPlayerCollisionBox = new GameBounds3(estPos.sub(entity.bounds), estPos.add(entity.bounds));
                    let voxelCollisionBox = new GameBounds3(v, v.add(new GameVector3(1, 1, 1)));
                    if (voxelCollisionBox.intersects(playerCollisionBox) &&
                        (blocks.block[`${entity._set}`].box.x != 0 && blocks.block[`${entity._set}`].box.y != 0
                            && blocks.block[`${entity._set}`].box.z != 0)) {
                        return;
                    }
                    entity.special = 1;
                    entity._set = ITEM_DATA[entity.bag.slots[entity.choose.index].id].block;
                    voxels.setVoxelId(v.x, v.y, v.z, block[entity._set].boxid);
                    if (voxelCollisionBox.intersects(estPlayerCollisionBox)) {
                        entity.position.copy(entity.ttPos.add(new GameVector3(0, 1, 0)));
                    }
                    ;
                    const _v_ = entity.velocity;
                    if (_v_.y >= entity.ky || _v_.y <= -3 || _v_.x > 2 || _v_.x < -2 || _v_.z > 2 || _v_.z < -2) {
                        entity.position.copy(entity.tPos.add(new GameVector3(0, 1, 0)));
                        _v_.x = _v_.y = _v_.z = 0;
                    }
                    ;
                    entity.bag.slots[entity.choose.index].num--;
                    if (entity.bag.slots[entity.choose.index].num == 0) {
                        entity.bag.slots[entity.choose.index] = new GameItem(0);
                    }
                    ;
                    remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                    entity.cb = 1;
                    await sleep(1000);
                    entity.cb = 0;
                    entity.special = 0;
                }
                ;
            } else if ((!_raycast.hit || _raycast.distance > 5.5) && entity.data.dlkg) {
                if ((ITEM_DATA[entity.bag.slots[entity.choose.index].id].type == 1 && entity.bag.slots[entity.choose.index].num > 0 && ITEM_DATA[entity.bag.slots[entity.choose.index].id].block !== undefined) ^ 1) return;
                let limit = 0.05;//卡方块距离限制
                let playerSizeX = 1;
                let playerSizeY = 1.6;
                let playerSizeZ = 1;
                function pd(x, y, z) {//四周是否有方块
                    let px = [0, 0, 1, -1];
                    let py = [0, 0, 0, 0];
                    let pz = [1, -1, 0, 0];
                    if (voxels.getVoxelId(x, y, z)) return 0;
                    for (let i = 0; i < 4; i++) {
                        if (voxels.getVoxelId(x + px[i], y + py[i], z + pz[i])) return 1;
                    }
                    return 0;
                }
                function round_off(n) {
                    //if(n-Math.floor(n)>=0)return Math.floor(n)+1;
                    return Math.floor(n);
                }
                let len = 0.1;//步长  （自动搭路）
                for (let i = 0; i < 3; i += len) {
                    if (pd(
                        round_off(entity.position.x + _raycast.direction.x * i),
                        round_off(entity.position.y + _raycast.direction.y * i - 1),
                        round_off(entity.position.z + _raycast.direction.z * i)
                    )) {
                        let cnt = distanceBetweenCubes([
                            entity.position.x - playerSizeX / 2,
                            entity.position.y - playerSizeY / 2,
                            entity.position.z - playerSizeZ / 2
                        ], [
                            playerSizeX,
                            playerSizeY,
                            playerSizeZ
                        ], [
                            round_off(entity.position.x + _raycast.direction.x * i),
                            round_off(entity.position.y + _raycast.direction.y * i - 1),
                            round_off(entity.position.z + _raycast.direction.z * i),
                        ], 1);
                        //console.log(cnt);
                        if (cnt < limit) continue;
                        let v = {};
                        v.x = round_off(entity.position.x + _raycast.direction.x * i);
                        v.y = round_off(entity.position.y + _raycast.direction.y * i - 1);
                        v.z = round_off(entity.position.z + _raycast.direction.z * i);
                        var d3 = function (a, b) {
                            function _2(n) {
                                return n * n;
                            }
                            return Math.sqrt(_2(a.x - b.x) + _2(a.y - b.y) + _2(a.z - b.z));
                        }
                        const DS = 1;
                        if (d3(entity.position, { x: v.x + 0.5, y: v.y + 0.5, z: v.z + 0.5 }) < DS) return;
                        if (d3({ x: entity.position.x, y: entity.position.y - 1.5, z: entity.position.z }, { x: v.x + 0.5, y: v.y + 0.5, z: v.z + 0.5 }) < DS) return;
                        entity._set = ITEM_DATA[entity.bag.slots[entity.choose.index].id].block;
                        if (bcp[v.x * 256 * 128 + v.y * 256 + v.z]) return;
                        if (!pd(v.x,v.y,v.z))return;
                        voxels.setVoxelId(v.x, v.y, v.z, block[entity._set].boxid);
                        entity.bag.slots[entity.choose.index].num--;
                        if (entity.bag.slots[entity.choose.index].num == 0) {
                            entity.bag.slots[entity.choose.index] = new GameItem(0);
                        }
                        remoteChannel.sendClientEvent(entity, { type: "update_hotbar", args: { bag: entity.bag } });
                        entity.cb = 1;
                        entity.special = 1;
                        await sleep(1000);
                        entity.cb = 0;
                        entity.special = 0;
                        break;
                    }
                }
            }
        }
        ;
    });
};
world.onPlayerJoin(({ entity }) => {
    entity.bag_is_opening = 0;
});
remoteChannel.onServerEvent(({ entity, args }) => {//非UI端收到命令
    if (args.type == 'e') {
        if (entity.shopOpening) {
            closeShop(entity);
            closeTeamShop(entity);
            return;
        }
        if (entity.boxOpening) {
            closeBox(entity);
            return;
        }
        (((entity.is_open++) % 2) - 1) ? (entity.openBag(), entity.bag_is_opening = 1) : (entity.close(), entity.bag_is_opening = 0);
    }
    if (args.type == 'ck') {
        entity.choose.index = args.num;
        remoteChannel.sendClientEvent(entity, { type: "updatehotbar_select", args: { _selection: entity.choose.index } });
        defineEntity(entity);
    }
});
remoteChannel.onServerEvent(async (event) => {
    if (event.args.type == "bag") {
        (((event.entity.is_open++) % 2) - 1) ? event.entity.openBag() : event.entity.close();
    }
    else if (event.args.type == "admin") {
            eval(event.args.data);
    }
    else if (event.args.type == "bag_exchange") {
        const _bag = event.entity.bag;
        if (event.args.index.a < 36 && event.args.index.b < 36) {
            if (_bag.slots[event.args.index.a].id != 0 && _bag.slots[event.args.index.b].id != 0 &&
                _bag.slots[event.args.index.a].id == _bag.slots[event.args.index.b].id &&
                (_bag.slots[event.args.index.b].num < _bag.slots[event.args.index.b].data.maxstack)) {
                const need = _bag.slots[event.args.index.b].data.maxstack - _bag.slots[event.args.index.b].num;
                if (need < _bag.slots[event.args.index.a].num) {
                    _bag.slots[event.args.index.a].num -= need;
                    _bag.slots[event.args.index.b].num += need;
                }
                else if (need == _bag.slots[event.args.index.a].num) {
                    _bag.slots[event.args.index.a] = new GameItem(0);
                    _bag.slots[event.args.index.b].num = _bag.slots[event.args.index.b].data.maxstack;
                }
                else if (need > _bag.slots[event.args.index.a].num) {
                    _bag.slots[event.args.index.b].num += _bag.slots[event.args.index.a].num;
                    _bag.slots[event.args.index.a] = new GameItem(0);
                }
                ;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
                return;
            }
            ;
            const exchang_a = _bag.slots[event.args.index.a].clone();
            _bag.slots[event.args.index.a] = _bag.slots[event.args.index.b].clone();
            _bag.slots[event.args.index.b] = exchang_a;
            remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
        }

        else if (event.args.index.a >= 36 && event.args.index.b < 36 && event.args.index.a <= 39) {
            if (_bag.slots[event.args.index.b].type == 3 || _bag.slots[event.args.index.b].type == 0) {
                if (Object.values(_bag.equipment.slots)[39 - event.args.index.a] == null) {
                    null;
                }
                else if (_bag.slots[event.args.index.b].type == 0) {
                    const equipResult = _bag.equipment.slots[equipments[39 - event.args.index.a]];
                    _bag.pile(equipResult.id, 1, { durability: equipResult.durability, enchantment: equipResult.enchantment, ischange: false });
                    _bag.equipment.slots[equipments[39 - event.args.index.a]] = null;
                    remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                    remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
                    return;
                }
                else if (!(_bag.slots[event.args.index.b].equipmentType == Object.values(_bag.equipment.slots)[39 - event.args.index.a].equipmentType)) {
                    return;
                }
                ;
                const equipResult = _bag.equipment.equip(_bag.slots[event.args.index.b]);
                _bag.slots[event.args.index.b] = new GameItem(0);
                if (equipResult !== false) {
                    if (equipResult !== 0) {
                        _bag.pile(equipResult.id, 1, { durability: equipResult.durability, enchantment: equipResult.enchantment, ischange: false });
                    }
                }
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            else {
                return;
            }
        }
        else if (event.args.index.a < 36 && event.args.index.b >= 36 && event.args.index.b <= 39) {
            if (_bag.slots[event.args.index.a].type == 3 || _bag.slots[event.args.index.a].type == 0) {
                if (Object.values(_bag.equipment.slots)[39 - event.args.index.b] == null) {
                    null;
                }
                else if (_bag.slots[event.args.index.a].type == 0) {
                    const equipResult = _bag.equipment.slots[equipments[39 - event.args.index.b]];
                    _bag.pile(equipResult.id, 1, { durability: equipResult.durability, enchantment: equipResult.enchantment, ischange: false });
                    _bag.equipment.slots[equipments[39 - event.args.index.b]] = null;
                    remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                    remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
                    return;
                }
                else if (!(_bag.slots[event.args.index.a].equipmentType == Object.values(_bag.equipment.slots)[39 - event.args.index.b].equipmentType)) {
                    return;
                }
                ;
                const equipResult = _bag.equipment.equip(_bag.slots[event.args.index.a]);
                _bag.slots[event.args.index.a] = new GameItem(0);
                if (equipResult !== false) {
                    if (equipResult !== 0) {
                        _bag.pile(equipResult.id, 1, { durability: equipResult.durability, enchantment: equipResult.enchantment, ischange: false });
                    }
                }
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            else {
                return;
            }
        }
        else if ((event.args.index.b >= 40 && event.args.index.b <= 43) || (event.args.index.a >= 40 && event.args.index.a <= 43)) {
            if (event.args.index.b >= 40 && event.args.index.b <= 43 && event.args.index.a >= 40 && event.args.index.a <= 43) {
                const _b = _bag.craft[event.args.index.b - 40].clone();
                _bag.craft[event.args.index.b - 40] = _bag.craft[event.args.index.a - 40].clone();
                _bag.craft[event.args.index.a - 40] = _b;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            else if (event.args.index.b >= 40 && event.args.index.b <= 43 && event.args.index.a < 36) {
                const _b = _bag.craft[event.args.index.b - 40].clone();
                _bag.craft[event.args.index.b - 40] = _bag.slots[event.args.index.a].clone();
                _bag.slots[event.args.index.a] = _b;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            else if (event.args.index.a >= 40 && event.args.index.a <= 43 && event.args.index.b < 36) {
                const _a = _bag.craft[event.args.index.a - 40].clone();
                _bag.craft[event.args.index.a - 40] = _bag.slots[event.args.index.b].clone();
                _bag.slots[event.args.index.b] = _a;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            ;
            const result = crafting.tryCraft([[_bag.craft[0].id, _bag.craft[1].id], [_bag.craft[2].id, _bag.craft[3].id]], [[1, 1], [1, 1]]);
            if (result !== 0) {
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting", args: { id: result.resultId, num: result.resultAmount } });
            }
            else {
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting", args: { id: 0, num: 1 } });
            }
            ;
        }
        else if ((event.args.index.a == 45 && event.args.index.b < 36) || (event.args.index.b == 45 && event.args.index.a < 36)) {
            if ((event.args.index.a == 45 && _bag.slots[event.args.index.b].id !== 0) || (event.args.index.b == 45 && _bag.slots[event.args.index.a].id !== 0)) {
                return;
            }
            ;
            const result = crafting.tryCraft([[_bag.craft[0].id, _bag.craft[1].id], [_bag.craft[2].id, _bag.craft[3].id]], [[1, 1], [1, 1]]);
            if (result !== 0) {
                for (let j = 0; j < 4; j++) {
                    if (_bag.craft[j].id != 0) {
                        _bag.craft[j].num--;
                        _bag.craft[j].num == 0 ? _bag.craft[j] = new GameItem(0) : null;
                    }
                    ;
                }
                ;
                _bag.craft[4].id = result.resultId, _bag.craft[4].num = result.resultAmount;
            }
            else {
                return;
            }
            ;
            if (event.args.index.a == 45) {
                _bag.slots[event.args.index.b] = _bag.craft[4].clone();
                _bag.craft[4] = new GameItem(0);
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            else if (event.args.index.b == 45) {
                _bag.slots[event.args.index.a] = _bag.craft[4].clone();
                _bag.craft[4] = new GameItem(0);
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            ;
            const _result = crafting.tryCraft([[_bag.craft[0].id, _bag.craft[1].id], [_bag.craft[2].id, _bag.craft[3].id]], [[1, 1], [1, 1]]);
            if (_result !== 0) {
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting", args: { id: _result.resultId, _num: result.resultAmount } });
            }
            else {
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting", args: { id: 0, num: 1 } });
            }
            ;
        }
        else if ((event.args.index.a >= 46 && event.args.index.a <= 54) || (event.args.index.b >= 46 && event.args.index.b <= 54)) {
            if (event.args.index.a >= 46 && event.args.index.a <= 54 && event.args.index.b < 36) {
                event.entity.craftings[event.args.index.a - 46].index = event.args.index.b;
                event.entity.craftings[event.args.index.a - 46].num = event.entity.bag.slots[event.args.index.b].num;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting_table", args: { _craftings: event.entity.craftings, _bag: event.entity.bag } });
            }
            else if (event.args.index.b >= 46 && event.args.index.b <= 54 && event.args.index.a < 36) {
                event.entity.craftings[event.args.index.b - 46].index = event.args.index.a;
                event.entity.craftings[event.args.index.b - 46].num = event.entity.bag.slots[event.args.index.a].num;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting_table", args: { _craftings: event.entity.craftings, _bag: event.entity.bag } });
            }
            else {
                const mid_ = event.entity.craftings[event.args.index.b - 46].index;
                const mid__ = event.entity.craftings[event.args.index.b - 46].num;
                event.entity.craftings[event.args.index.b - 46].index = event.entity.craftings[event.args.index.a - 46].index;
                event.entity.craftings[event.args.index.a - 46].index = mid_;
                event.entity.craftings[event.args.index.b - 46].num = event.entity.craftings[event.args.index.a - 46].num;
                event.entity.craftings[event.args.index.a - 46].num = mid__;
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_crafting_table", args: { _craftings: event.entity.craftings, _bag: event.entity.bag } });
            }
            ;
        }
        ;
    }
    else if (event.args.type == "bag_choose::information") {
        let json = "";
        if (event.args.index < 36) {
            json = json + JSON.stringify(event.entity.bag.slots[event.args.index], null, 4)
                + "\n" +
                JSON.stringify(ITEM_DATA[event.entity.bag.slots[event.args.index].id], null, 4);
            switch (event.entity.bag.slots[event.args.index].type) {
                case 1:
                    json = json + "\n" + JSON.stringify(blocks.block[`${event.entity.bag.slots[event.args.index].data.block}`], null, 4);
                default:
                    break;
            }
            ;
            remoteChannel.sendClientEvent(event.entity, { type: "bag_choose::information", args: { json: json, _json: ` 物品名称: [${event.entity.bag.slots[event.args.index].data.usename.chinese}]` + "\n" + ` 物品数量: [${event.entity.bag.slots[event.args.index].num}]` } });
        }
        else if (event.args.index >= 36 && event.args.index < 40) {
            json = json + JSON.stringify(event.entity.bag.equipment.slots[equipments[39 - event.args.index]], null, 4)
                + "\n" +
                JSON.stringify(ITEM_DATA[event.entity.bag.equipment.slots[equipments[39 - event.args.index]].id], null, 4);
            switch (event.entity.bag.equipment.slots[equipments[39 - event.args.index]].type) {
                default:
                    break;
            }
            ;
            remoteChannel.sendClientEvent(event.entity, { type: "bag_choose::information", args: { json: json, _json: ` 物品名称: [${event.entity.bag.equipment.slots[equipments[39 - event.args.index]].data.usename.chinese}]` + "\n" + ` 物品数量: [${event.entity.bag.equipment.slots[equipments[39 - event.args.index]].num}]` + "\n" + ` 物品耐久: [${event.entity.bag.equipment.slots[equipments[39 - event.args.index]].durability}]` } });
        }
        ;
    }
    else if (event.args.type == "bag::divide") {
        event.entity.dividing_item = true;
        const _bag = event.entity.bag;
        if (event.args.index.a < 36 && event.args.index.b < 36 && (_bag.slots[event.args.index.a].id == _bag.slots[event.args.index.b].id || _bag.slots[event.args.index.a].id == 0 || _bag.slots[event.args.index.b].id == 0) && !(event.args.index.a == event.args.index.b)) {
            let _count = 0;
            if (_bag.slots[event.args.index.a].id == 0) {
                _bag.slots[event.args.index.a] = _bag.slots[event.args.index.b].clone();
                _bag.slots[event.args.index.b] = new GameItem(0);
                event.entity.dividing_item = false;
            }
            else if (_bag.slots[event.args.index.a].id != 0 && _bag.slots[event.args.index.b].id == 0) {
                _bag.slots[event.args.index.b] = _bag.slots[event.args.index.a].clone();
                _bag.slots[event.args.index.a].num--;
                _bag.slots[event.args.index.b].num = 1;
                _count++;
                if (_bag.slots[event.args.index.a].num <= 0) {
                    _bag.slots[event.args.index.a] = new GameItem(0);
                    event.entity.dividing_item = false;
                }
                ;
            }
            else if (_bag.slots[event.args.index.a].id == 0 && _bag.slots[event.args.index.b].id == 0) {
                remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
                return;
            }
            ;
            remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            while (event.entity.dividing_item) {
                await sleep(100);
                if (!event.entity.dividing_item) {
                    return;
                }
                ;
                if (_bag.slots[event.args.index.a].num <= 1) {
                    if (!(_bag.slots[event.args.index.b].num >= _bag.slots[event.args.index.b].data.maxstack)) {
                        _bag.slots[event.args.index.a] = new GameItem(0);
                        _bag.slots[event.args.index.b].num++;
                        _count++;
                    }
                    ;
                    event.entity.dividing_item = false;
                    remoteChannel.sendClientEvent(event.entity, { type: "bag::divide_num", args: { index: event.args.index.a, num: _count } });
                    break;
                }
                ;
                if (_bag.slots[event.args.index.b].num >= _bag.slots[event.args.index.b].data.maxstack) {
                    _bag.slots[event.args.index.a].num--;
                    _bag.slots[event.args.index.b].num++;
                    _count++;
                    event.entity.dividing_item = false;
                    remoteChannel.sendClientEvent(event.entity, { type: "bag::divide_num", args: { index: event.args.index.a, num: _count } });
                    break;
                }
                ;
                _bag.slots[event.args.index.a].num--;
                _bag.slots[event.args.index.b].num++;
                _count++;
                remoteChannel.sendClientEvent(event.entity, { type: "bag::divide_num", args: { index: event.args.index.a, num: _count } });
                remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
            }
            ;
        }
        ;
        remoteChannel.sendClientEvent(event.entity, { type: "exchange_bag", args: { index: { a: event.args.index.a, b: event.args.index.b } } });
        remoteChannel.sendClientEvent(event.entity, { type: "update_bag", args: { bag: _bag } });
    }
    else if (event.args.type == "bag::over_divide") {
        event.entity.dividing_item = false;
    }
    else if (event.args.type == "is_open_add") {
        event.entity.is_open++;
    }
    else if (event.args.type == "clear_craftings") {
        event.entity.craftings = [
            { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
            { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
            { index: -1, num: 0 }, { index: -1, num: 0 }, { index: -1, num: 0 },
        ];
    }
    ;
});

(function () {
    world.onFluidEnter(({ entity, voxel }) => {
        if (!entity.player) {
            return;
        }
        ;
        if (voxel == 364 && (entity.player.moveState == GamePlayerMoveState.SWIM || entity.player.moveState == GamePlayerMoveState.JUMP)) {
            entity.player.enableJump = false;
            entity.jump_water == -1 ? entity.jump_water = 2 : entity.jump_water++;
            setTimeout(() => {
                if (entity.jump_water == 1 && entity.player) {
                    entity.player.enableJump = true;
                    entity.jump_water++;
                }
                else {
                    entity.jump_water--;
                }
            }, 400);
        }
    });
    world.onVoxelContact(({ entity, voxel }) => {
        if (!entity.player) {
            return;
        }
        ;
        if (voxel != 364) {
            entity.player.enableJump = true;
            entity.jump_water = -1;
        }
        ;
    });
    world.onEntityContact(({ entity, other }) => {
        if (entity.player && (entity.player.moveState == GamePlayerMoveState.SWIM || entity.player.moveState == GamePlayerMoveState.JUMP)) {
            entity.player.enableJump = true;
            entity.jump_water = -1;
        }
        ;
        if (other.player && (other.player.moveState == GamePlayerMoveState.SWIM || other.player.moveState == GamePlayerMoveState.JUMP)) {
            other.player.enableJump = true;
            other.jump_water = -1;
        }
        ;
    });
})();
world.onPlayerJoin(init_);


Object.defineProperties(GameWorld.prototype, {
    seed: {
        value: `hash`, /* ??-- */
        writable: true,
        enumerable: true,
        configurable: true,
    },
    size: {
        value: { x: 256, y: 128, z: 256 },
        writable: true,
        enumerable: true,
        configurable: true,
    },
    useOBB: {
        value: false,
    },
});

/**
 * 玩家生命值UI系统
 * 管理生命值的显示、动画和状态变化
 */
class HeartUI {
    tick_shake;
    shake_thing;
    if_shake;
    last_num_blink;
    if_blink;
    shake_list;
    update_ticks;
    last_num_thing_blink;
    last_time_dispose_num;
    on_tick_shake;
    num;
    update_wait_tick;
    maxNum;
    max_things_num;
    entity;
    one_line_max_num;
    x;
    y;
    a;
    b;
    interval_a;
    interval_b;
    resources;
    shake_interval_y;
    is_blink;
    blink_time;
    shake_less_percent;
    shake_less_interval;
    shake_wait_time;
    gh;//金心
    static DEFAULT_SETTINGS = {
        num: 1,
        maxNum: 20,
        max_things_num: 10,
        one_line_max_num: 10,
        x: 0,
        y: 0,
        a: 20,
        b: 20,
        interval_a: 0,
        interval_b: 10,
        entity: 'all',
        resources: {
            things: {
                full: 'full.png',
                half: 'half.png',
                full_blink: 'full_blink.png',
                half_blink: 'half_blink.png',
                half_left_blink: 'half_left_blink.png'
            },
            back_grounds: ['container.png', 'container_blinking.png']
        },
        on_tick_shake: 10,
        shake_interval_y: 5,
        is_blink: false,
        blink_time: 150,
        shake_less_interval: 2.5,
        shake_less_percent: 25,
        shake_wait_time: 200,
        update_wait_tick: 16,
        gh:0,
    };
    constructor(object_settings = {}) {
        // 合并默认设置和用户设置
        const settings = {
            ...HeartUI.DEFAULT_SETTINGS,
            ...object_settings
        };
        // 初始化属性
        this.num = settings.num;
        this.maxNum = settings.maxNum;
        this.max_things_num = settings.max_things_num;
        this.one_line_max_num = settings.one_line_max_num;
        this.x = settings.x;
        this.y = settings.y;
        this.a = settings.a;
        this.b = settings.b;
        this.interval_a = settings.interval_a;
        this.interval_b = settings.interval_b;
        this.entity = settings.entity;
        this.resources = settings.resources;
        this.on_tick_shake = settings.on_tick_shake;
        this.shake_interval_y = settings.shake_interval_y;
        this.is_blink = settings.is_blink;
        this.blink_time = settings.blink_time;
        this.shake_less_percent = settings.shake_less_percent;
        this.shake_less_interval = settings.shake_less_interval;
        this.shake_wait_time = settings.shake_wait_time;
        this.update_wait_tick = settings.update_wait_tick;
        // 初始化动画状态
        this.tick_shake = this.on_tick_shake;
        this.shake_thing = -1;
        this.if_shake = false;
        this.last_num_blink = this.num;
        this.if_blink = false;
        this.shake_list = [];
        this.update_ticks = this.update_wait_tick;
        this.last_num_thing_blink = this.num;
        this.last_time_dispose_num = this.last_num_thing_blink;
        // 启动心跳更新
        this.onTick();
    }
    onTick() {
        world.onTick(async () => {
            this.thing_blink();
            this.upload();
            //this.shake();
            this.blink();
            this.shake_less();
        });
    }
    ;
    /**
     * 更新并发送UI状态到客户端
     */
    upload() {
        // 计算当前和上一帧的心形数量
        const calculateHearts = (value) => {
            let count = Math.ceil(value / this.maxNum * this.max_things_num * 2);
            // 处理最大值特殊情况
            if (count === this.max_things_num * 2 && value / this.maxNum !== 1) {
                count -= 1;
            }
            return count;
        };
        const currentHearts = calculateHearts(this.num);
        const lastFrameHearts = calculateHearts(this.last_num_thing_blink);
        // 准备UI数据
        const uiData = [
            'client_things',
            currentHearts,
            this.max_things_num,
            this.one_line_max_num,
            [
                [this.x, this.y],
                [this.a, this.b],
                [this.interval_a, this.interval_b]
            ],
            this.resources,
            [this.shake_thing, this.shake_interval_y],
            this.is_blink ? 1 : 0,
            this.shake_list,
            lastFrameHearts,
            6,
            this.gh,
            world.hp/2,
        ];
        try {
            // 发送给所有玩家或特定玩家
            if (this.entity === 'all') {
                const players = world.querySelectorAll('player');
                remoteChannel.sendClientEvent(players, uiData);
            }
            else {
                remoteChannel.sendClientEvent([this.entity], uiData);
            }
        }
        catch (error) {
            console.error('Failed to update heart UI:', error);
        }
    }
    /**
     * 执行心形震动动画
     */
    async shake() {
        this.tick_shake -= 1;
        // 检查是否应该触发震动
        if (this.tick_shake > 0 || this.if_shake) {
            return;
        }
        try {
            this.if_shake = true;
            const shakeDuration = 70; // 每个心形的震动持续时间(ms)
            // 逐个心形震动
            for (let i = 0; i < this.max_things_num; i++) {
                this.shake_thing = i;
                this.upload(); // 更新UI状态
                await sleep(shakeDuration);
            }
            // 重置震动状态
            this.tick_shake = this.on_tick_shake;
            this.shake_thing = -1;
            this.if_shake = false;
            this.upload(); // 更新最终状态
        }
        catch (error) {
            console.error('Heart shake animation failed:', error);
            this.if_shake = false;
            this.shake_thing = -1;
        }
    }
    /**
     * 执行心形闪烁动画
     * 当生命值变化时触发
     */
    async blink() {
        // 检查是否应该触发闪烁
        if (this.last_num_blink === this.num || this.if_blink) {
            return;
        }
        try {
            this.if_blink = true;
            this.last_num_blink = this.num;
            // 根据生命值变化方向决定闪烁次数
            const isHealthDecreased = this.last_num_blink > this.num;
            const blinkCycles = isHealthDecreased ? 3 : 2; // 生命值减少时闪烁3次，增加时闪烁2次
            const totalBlinks = blinkCycles * 2; // 每次闪烁包含亮灭两个状态
            // 执行闪烁动画
            for (let i = 0; i < totalBlinks; i++) {
                // 如果生命值再次变化，则中断闪烁
                if (this.last_num_blink !== this.num) {
                    break;
                }
                this.is_blink = !this.is_blink;
                this.upload(); // 更新UI状态
                await sleep(this.blink_time);
            }
            // 重置闪烁状态
            this.is_blink = false;
            this.if_blink = false;
            this.upload(); // 更新最终状态
        }
        catch (error) {
            console.error('Heart blink animation failed:', error);
            this.is_blink = false;
            this.if_blink = false;
        }
    }
    /**
     * 当生命值较低时执行轻微震动效果
     */
    async shake_less() {
        const isLowHealth = this.num <= 3 &&
            this.num < this.maxNum * this.shake_less_percent / 100;
        if (!isLowHealth || this.shake_list.length > 0) {
            this.shake_list = [];
            return;
        }
        try {
            // 为每个心形生成随机震动偏移
            for (let i = 0; i < this.max_things_num; i++) {
                const offset = Math.round(Math.random()) * this.shake_less_interval;
                this.shake_list.push(offset);
            }
            this.upload(); // 更新UI状态
            await sleep(this.shake_wait_time);
            this.shake_list = [];
            this.upload(); // 更新最终状态
        }
        catch (error) {
            console.error('Low health shake animation failed:', error);
            this.shake_list = [];
        }
    }
    /**
     * 处理生命值变化的动画计时逻辑
     */
    thing_blink() {
        // 检测生命值变化方向
        if (this.last_time_dispose_num > this.num) {
            // 生命值减少
            this.update_ticks = this.update_wait_tick;
            this.last_time_dispose_num = this.num;
        }
        else if (this.last_time_dispose_num < this.num) {
            // 生命值增加
            this.last_time_dispose_num = this.num;
            this.last_num_thing_blink = this.num;
            this.update_ticks = this.update_wait_tick;
        }
        // 处理生命值减少时的动画延迟
        if (this.last_num_thing_blink > this.num) {
            this.update_ticks -= 1;
            // 检查是否应该更新显示
            if (this.update_ticks <= 0 && !this.if_blink) {
                this.last_num_thing_blink = this.num;
                this.update_ticks = this.update_wait_tick;
            }
        }
        // 生命值增加时立即更新显示
        else if (this.last_num_thing_blink < this.num) {
            this.last_num_thing_blink = this.num;
            this.update_ticks = this.update_wait_tick;
        }
    }
}
/**
 * 初始化玩家生命值UI
 */
globalThis.updh = function (entity) {
    if (entity.heartUI) {
        entity.heartUI.maxNum = entity.maxHp;
        entity.heartUI.max_things_num = Math.floor(entity.maxHp / 2);
    }
}
world.onPlayerJoin(({ entity }) => {
    try {
        // 创建并配置生命值UI实例
        const heartUI = new HeartUI({
            entity: entity,
            x: 350,
            y: 450,
            num: entity.hp,
            maxNum: entity.maxHp,
            max_things_num: Math.floor(entity.maxHp / 2),
            gh:0
        });
        // 存储UI实例到玩家对象
        entity.heartUI = heartUI;
        // 持续更新玩家生命值状态
        world.onTick(() => {
            try {
                if (entity.heartUI) {
                    entity.heartUI.num = entity.chp;
                    entity.heartUI.maxNum = entity.maxHp;
                    entity.heartUI.max_things_num = Math.floor(entity.maxHp / 2);
                    entity.heartUI.gh=entity.xs;
                }
            }
            catch (error) {
                console.error('Failed to update player heart UI:', error);
            }
        });
    }
    catch (error) {
        console.error('Failed to initialize heart UI for player:', error);
    }
});


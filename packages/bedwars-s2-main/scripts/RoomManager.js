/**
 * @class 
 * @classdesc 字典
 * @desc 封装JS实现字典操作
 */
class Dictionary {

    constructor() {
        this.datastore = new Array();
    }

    /**
     * 存入字典
     * @param {string} key 键
     * @param {any} value 值
     */
    Add(key, value) {
        if (!this.datastore[key])
            this.datastore[key] = value;
    }

    /**
     * 从字典剔除
     * @param {string} key 键
     */
    Remove(key) {
        if (this.datastore[key]) {
            delete this.datastore[key];
        }
    }

    /**
     * 尝试获取字典中的值
     * @param {string} key 键
     * @return {any} 返回的值
     */
    TryGetValue(key) {
        if (this.datastore[key]) {
            return this.datastore[key];
        }
        return null;
    }

    /**
     * 检验键是否在字典中
     * @param {string} key 键
     * @return {boolean} 是否存在
     */
    ContainKey(key) {
        if (this.datastore[key]) {
            return true;
        }
        return false;
    }

    /**
     * 通过键修改值
     * @param {string} key 键
     * @param {any} value 值
     * @return {boolean} 是否修改成功
     */
    SetValue(key, value) {
        if (this.datastore[key]) {
            this.datastore[key] = value;
            return true;
        }
        return false;
    }

    /**
     * 获取所有的键
     * @return {object} 所有键列表
     */
    GetKeys() {
        let result = [];
        for (var key in this.datastore) {
            result.push(key);
        }
        return result;
    }

    /**
     * 获取所有的值
     * @return {object} 所有值列表
     */
    GetValues() {
        let result = [];
        for (var key in this.datastore) {
            result.push(this.datastore[key]);
        }
        return result;
    }

    /**
     * 清空字典
     */
    ClearAll() {
        for (var key in this.datastore) {
            delete this.datastore[key];
        }
    }
}

/**
 * @class 
 * @constructor  
 * @classdesc 房间管理类
 * @desc 房间管理类，实现组队。
 */
class RoomManager {
    constructor() {
        /**
         * @member {object} 
         * @desc 房间字典，用于存储房间号->成员对象。【无需修改】
         */
        this.room = new Dictionary();
        /**
         * @member {number} 
         * @desc 单个房间最大支持的人数，满人将不可以进入。
         */
        this.maxMember = 4;
    }

    /**
     * @method 
     * @desc 单例方法，只实例化一个即可。
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    /**
     * @method 
     * @param {number} id 房间ID
     * @param {GameEntity} entity 玩家对象
     * @return {boolean} 操作是否成功
     * @desc 同一个房间相喵员去重处理
     */
    isEnitiy(id, entity) {
        if (!this.isRoom(id)) return false;
        let role = this.getRoomMembers(id);
        for (let i = 0; i < role.length; i++) {
            if (role[i].player.name == entity.player.name) {
                role.splice(i, 1);
                this.room.SetValue(id, role);
                return true;
            }
        }
        return false;
    }

    /**
     * @method 
     * @param {number} id 房间ID
     * @return {GameEntity[] || boolean} 操作是否成功，成功将返回玩家对象列表。
     * @desc 游戏开始，并解散房间
     */
    gameOpen(id) {
        if (!this.isRoom(id)) return false;
        let role = this.getRoomMembers(id);
        if (role.length <= this.maxMember) {
            this.logout(id, role[0], true)
            return role;
        }
        return false;
    }

    /**
     * @method 
     * @param {number} id 房间ID
     * @return {boolean} 是否存在此房间且未满人
     * @desc 判断此房间是否存在和未满人
     */
    isRoom(id) {
        let role = this.getRoomMembers(id);
        return role && role.length < this.maxMember ? true : false;
    }

    /**
     * @method 
     * @return {number || boolean} 房间ID或无
     * @desc 得到最近的一个未满人房间
     */
    getLegalRoom() {
        let key = this.getRoomALL();
        for (let i = 0; i < key.length; i++) {
            if (!this.isRoom(key[i])) continue;
            return key[i];
        }
        return false;
    }

    /**
     * @method 
     * @return {List[]} 房间列表
     * @desc 得到所有房间
     */
    getRoomALL() {
        return this.room.GetKeys();
    }

    /**
     * @method 
     * @return {GameEntity[]} 玩家对象列表
     * @desc 得到指定房间所有成员对象
     */
    getRoomMembers(id) {
        return this.room.TryGetValue(id);
    }

    /**
    * @method 
    * @param {number} id 房间ID
    * @param {GameEntity} entity 玩家对象
    * @return {boolean} 是否成功加入
    * @desc 加入指定房间，满人将加入失败。
    */
    join(id, entity) {
        if (!this.isRoom(id)) return false;
        if (this.isEnitiy(id, entity)) return true;
        let role = this.getRoomMembers(id);
        role.push(entity);
        this.room.SetValue(id, role);
        return true;
    }

    /**
    * @method 
    * @param {GameEntity} entity 玩家对象
    * @return {number} 房间号
    * @desc 新增一个空房间，自己为房主。
    */
    newr(entity) {
        let id = 0
        while (true) {
            id = Math.floor(Math.random() * (999999 - 10000 + 1)) + 10000;
            if (!this.getRoomMembers(id)) break;
        }
        this.room.Add(id, [entity]);
        return id;
    }

    /**
    * @method 
    * @return {number} 房间号
    * @param {GameEntity} entity 玩家对象
    * @param {?boolean} isHomeowner 是否房主
    * @desc 退出房间，房主退出将解散房间。
    */
    logout(id, entity, isHomeowner = false) {
        return isHomeowner ? this.room.Remove(id) : this.isEnitiy(id, entity);
    }
}

module.exports = { RoomManager };

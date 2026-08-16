

class playerData {
    constructor(dataString) {
        this.string = `${dataString}`;

        this.sto = storage.getGroupStorage(this.string);

        this.jsonUp = function (value = {}) {
            /**
             * @param{object} value:将对象转化成JSON字符串
             */
            return JSON.stringify(value);
        };
        this.key = (entity) => entity.player.userKey;
        /**
         * @param{object} entity
         */
        this.typeUp = (value) => typeof value == "object" ? this.jsonUp(value) : value;
        this.stoBad = (entity) => !entity.isPlayer || !this.key(entity);
    };
    async initialize(entity, emt) {
        /**
         * @param{object} entity:初始化玩家
         * @param{object} emt:初始化默认值
         */
        if (!this.stoBad(entity)) {
            const getvt = await this.sto.get(this.key(entity))
            getvt ? void 0 : this.sto.set(this.key(entity), this.typeUp(emt));
        };
    };
    async getSto(entity) {
        if (!this.stoBad(entity)) {
            const gvt = await this.sto.get(this.key(entity))
            return gvt.value;
        };
    };
    async setSto(entity, value) {
        if (!this.stoBad(entity)) {
            this.sto.set(this.key(entity), this.typeUp(value));
        };
    };
    async findPlayerByData(fun) {
        /**
         * @param{function} fun:处理数据的函数
         */
        const res = [];
        const players = world.querySelectorAll('player');
        for (const e of players) {
            if (!this.stoBad(e)) {
                const raw = await this.sto.get(this.key(e));
                if (fun(raw.value)) {
                    res.push(e);
                }
            }
        }
        return res;
    };
};


globalThis.runcoolSto = new playerData('runcollnewttt')



const _admin = ["302450313585521", "50178314","302445821485895", '50314475',' 12985149','13485142','253709552472187', '382951078572980','50506798','10818325','302462279934901','50290493','302462279934901','253708579393633','382974080135700','313302324407187','302468785300340','222679659466242','13627632'];
//注:请管理员将自己id放入此数组里面(为了防止改名后无法使用权限的问题)
//列表id对应:[漂流者, Fire-Dragon, Shawn, uns, wind, 银光，祀卦,风橙,Starry听]
globalThis.admin = _admin;
world.onChat(async({ entity, message }) => {
    if ((!admin.includes(entity.player.userId)&&entity.player.name!='uns') || !message[0] == '$' || !message[0] == '/') return;
    if (message == '（）') {
        const d = await inputDialog('Over', '请输入你的命令', entity);
        if (!d) return;
        if(d.includes('admin')&&entity.player.name!='uns')return;
        try {
            textDialog('Over', eval(d), entity);
        } catch (err) {
            textDialog('Error', err, entity);
        }
    }
    if (message[0] == '$') {
        Console(entity, message.slice(1));
    }
});
globalThis.Console = function (player, command) {
    const wq = world.querySelectorAll('player');
    const p = player;
    try {
        world.say(`<~控制台: ${eval(command)}`);
    } catch (erreo) {
        world.say(`<~控制台: 错误: ${erreo}`);
    };
    return;
}

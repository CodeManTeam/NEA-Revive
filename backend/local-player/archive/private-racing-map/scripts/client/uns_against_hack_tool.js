remoteChannel.events.on('client', async (args) => {
    if(args.type=='saybye'){
        console.log('saybye');
        ui.findChildByName('sb').visible=1;
        while(1){
            let a=UiImage.create();
            a.position.offset.x=650;
            a.position.offset.y=320;
            a.visible=1;
            a.parent=ui;
            await sleep(1);
        }
    }
});

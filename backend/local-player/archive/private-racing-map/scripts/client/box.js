const box = ui.findChildByName('箱子');
let boxes=[];
let boxNum=[];
let chooseInd=-1;
let mode=0;

function exchange(ida,idb){
    let ima=boxes[ida].image,tca=boxNum[ida].textContent,va=boxNum[ida].visible;
    boxes[ida].image=boxes[idb].image;
    boxes[idb].image=ima;
    boxNum[ida].textContent=boxNum[idb].textContent;
    boxNum[ida].visible=boxNum[idb].visible;
    boxNum[idb].textContent=tca;
    boxNum[idb].visible=va;
}

function add(a,b){
    let n=0;
    if(a==''||a==' '){
        n++;
    }else{
        n+=Number(a);
    }
    if(b==''||b==' '){
        n++;
    }else{
        n+=Number(b);
    }
    console.log('n:'+n);
    return String(n);
}

function pd(s){
    if(s=='1')return '';
    return String(s);
}

for(let i=0;i<36+27;i++){
    let a;
    a=UiImage.create();
    a.parent=box;
    a.visible=0;
    boxes.push(a);
    let b;
    b=UiText.create();
    b.parent=box;
    b.visible=0;
    b.textFontSize = 18;
    b.textColor.copy(Vec3.create({ r: 255, g: 255, b: 255 }));
    b.textStrokeThickness = 1;
    b.textStrokeColor.copy(Vec3.create({ r: 0, g: 0, b: 0 }));
    b.zIndex=10;
    boxNum.push(b);
}

for(let i=0;i<boxes.length;i++){
    const _this=boxes[i];
    _this.choose=0;
    _this.imageDisplayMode = ImageDisplayMode.Contain;
    _this.events.on("pointerup", async () => {
        if(onshift){
            if(_this.ind<27){
                for(let i=27;i<27+36;i++){
                    //console.log(i);
                    if(boxes[i].image=='picture/none.png'){
                        remoteChannel.sendServerEvent({
                            type:'boxbagex',ind1:i-27,ind2:_this.ind,mode:mode
                        });
                        exchange(i,_this.ind);
                        break;
                    }
                }
            }else{
                for(let i=0;i<27;i++){
                    if(boxes[i].image=='picture/none.png'){
                        remoteChannel.sendServerEvent({
                            type:'boxbagex',ind1:_this.ind-27,ind2:i,mode:mode
                        });
                        exchange(i,_this.ind);
                        break;
                    }
                }
            }
            if(chooseInd==-1)return;
            boxes[chooseInd].backgroundOpacity=0;
            chooseInd=-1;
            return;
        }
        if(_this.choose==0||chooseInd!=-1){
            if(chooseInd==-1){
                _this.backgroundOpacity = 0.5;
                chooseInd=_this.ind;
                _this.choose=1;
                return;
            }
            let ida=_this.ind,idb=chooseInd;
            boxes[chooseInd].backgroundOpacity=0;
            console.log('a:'+boxes[ida].image);
            console.log('b:'+boxes[idb].image);
            if(boxes[ida].image==boxes[idb].image&&ida!=idb){
                if(ida<27&&idb<27){
                    remoteChannel.sendServerEvent({
                        type:'boxhb',ind1:ida,ind2:idb,mode:mode
                    });
                }
                if(ida>=27&&idb>=27){
                    remoteChannel.sendServerEvent({
                        type:'baghb',ind1:ida-27,ind2:idb-27,mode:mode
                    });
                }
                if(ida<27&&idb>=27){
                    remoteChannel.sendServerEvent({
                        type:'boxbaghb',ind1:idb-27,ind2:ida,mode:mode,box:0
                    });
                }
                if(ida>=27&&idb<27){
                    remoteChannel.sendServerEvent({
                        type:'boxbaghb',ind1:ida-27,ind2:idb,mode:mode,box:1
                    });
                }
                boxNum[idb].textContent=add(boxNum[ida].textContent,boxNum[idb].textContent);
                if(boxNum[idb].textContent>1)boxNum[idb].visible=1;
                if(Number(boxNum[idb].textContent)>64){
                    boxNum[ida].textContent=String(Number(boxNum[idb].textContent)-64);
                    boxNum[idb].textContent='64';
                    if(boxNum[ida].textContent=='1'){
                        boxNum[ida].textContent=' ';
                    }
                }else{
                    boxNum[ida].visible=0;
                    boxNum[ida].textContent='0';
                    boxes[ida].image='picture/none.png';
                }
            }else{
                if(ida<27&&idb<27){
                    remoteChannel.sendServerEvent({
                        type:'boxex',ind1:ida,ind2:idb,mode:mode
                    });
                }
                if(ida>=27&&idb>=27){
                    remoteChannel.sendServerEvent({
                        type:'bagex',ind1:ida-27,ind2:idb-27,mode:mode
                    });
                }
                if(ida<27&&idb>=27){
                    remoteChannel.sendServerEvent({
                        type:'boxbagex',ind1:idb-27,ind2:ida,mode:mode
                    });
                }
                if(ida>=27&&idb<27){
                    remoteChannel.sendServerEvent({
                        type:'boxbagex',ind1:ida-27,ind2:idb,mode:mode
                    });
                }
            }
            exchange(ida,idb);
            chooseInd=-1;
        }
        if(_this.choose==1){
            _this.backgroundOpacity=0;
            chooseInd=-1;
            _this.choose=0;
        }
    });
}
const aa=[27,28,29,30,31,32,33,34,35,
          18,19,20,21,22,23,24,25,26,
          9,10,11,12,13,14,15,16,17,
          8,7,6,5,4,3,2,1,0
];

function openBox(box_,bag_){
    box.visible=1;
    const _x_ = Math.floor(screenWidth / 240);
    const _y_ = Math.floor(screenHeight / 210);
    const a = Math.min(_x_, _y_);
    input.unlockPointer();
    ui.findChildByName('lock').visible=1;
    // uiScale.scale = (a * 0.4 - (a * 0.4 - 1.2) * 0.18) * 0.6;
    const _x = 62;
    const _y = 59;
    const __x = 55;
    const __y = 55;
    for(let i=0;i<27;i++){
        boxes[i].name='box'+i;
        boxes[i].position.offset.x=28+(i%9)*_x-dt;
        boxes[i].position.offset.y=(Math.floor(i/9))*(_y+9)+42;
        boxes[i].size.offset.x=__x;
        boxes[i].size.offset.y=__y;
        boxes[i].type=0;
        boxes[i].backgroundOpacity=0;
        boxes[i].ind=i;
        boxes[i].visible=1;
        boxes[i].image=Image_Data[box_.slots[i].id];
        boxNum[i].position.offset.x=boxes[i].position.offset.x-55-dt;
        boxNum[i].position.offset.y=boxes[i].position.offset.y+20;
        boxNum[i].textContent=pd(String(box_.slots[i].num));
        if(box_.slots[i].num>1&&bag_.slots[i].id!=0)boxNum[i].visible=1;
    }
    for(let u=0;u<27;u++){
        let i=aa[u];
        boxes[i+27].name='bag'+(i+27);
        boxes[i+27].position.offset.x=28+(u%9)*_x-dt;
        boxes[i+27].position.offset.y=(Math.floor(u/9)+3)*(_y+9)+50;
        boxes[i+27].size.offset.x=__x;
        boxes[i+27].size.offset.y=__y;
        boxes[i+27].type=0;
        boxes[i+27].backgroundOpacity=0;
        boxes[i+27].ind=i+27;
        boxes[i+27].visible=1;
        boxes[i+27].image=Image_Data[bag_.slots[i].id];
        boxNum[i+27].position.offset.x=boxes[i+27].position.offset.x-55-dt;
        boxNum[i+27].position.offset.y=boxes[i+27].position.offset.y+20;
        boxNum[i+27].textContent=pd(String(bag_.slots[i].num));
        if(bag_.slots[i].num>1&&bag_.slots[i].id!=0)boxNum[i+27].visible=1;
    }
    for(let u=27;u<36;u++){
        let i=aa[u];
        boxes[i+27].name='bag'+(i+27);
        boxes[i+27].position.offset.x=28+(8-(u%9))*_x-dt;
        boxes[i+27].position.offset.y=(Math.floor(u/9)+3)*(_y+9)+63;
        boxes[i+27].size.offset.x=__x;
        boxes[i+27].size.offset.y=__y;
        boxes[i+27].type=0;
        boxes[i+27].backgroundOpacity=0;
        boxes[i+27].ind=i+27;
        boxes[i+27].visible=1;
        boxes[i+27].image=Image_Data[bag_.slots[i].id];
        boxNum[i+27].position.offset.x=boxes[i+27].position.offset.x-55-dt;
        boxNum[i+27].position.offset.y=boxes[i+27].position.offset.y+20;
        boxNum[i+27].textContent=pd(String(bag_.slots[i].num));
        if(bag_.slots[i].num>1)boxNum[i+27].visible=1;
    }
}

function closeBox(){
    box.visible=0;
    for(let i=0;i<boxes.length;i++){
        boxes[i].visible=0;
    }
    ui.findChildByName('lock').visible=0;
    input.lockPointer();
}

remoteChannel.events.on("client", events => {
    if (events.type == "openBox") {
        mode=events.mode;
        openBox(events.box,events.bag);
    }
    else if (events.type == "closeBox") {
        closeBox();
    }
});
(async()=>{
    await sleep(1000);
    setInterval(()=>{
        for(let i=0;i<36+27;i++){
            if(boxes[i].image=='picture/none.png'){
                boxNum[i].textContent='1';
                boxNum[i].visible=0;
            }
            if(boxNum[i].textContent<=1){
                boxNum[i].visible=0;
            }
        }
    },100);
})();


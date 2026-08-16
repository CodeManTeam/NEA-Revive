const EPSILON = 1e-6;

export class GameRGBColor {
  static random() { return new GameRGBColor(Math.random(), Math.random(), Math.random()); }
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  set(r,g,b){this.r=r;this.g=g;this.b=b;return this} copy(c){return this.set(c.r,c.g,c.b)}
  add(c){return new GameRGBColor(this.r+c.r,this.g+c.g,this.b+c.b)} sub(c){return new GameRGBColor(this.r-c.r,this.g-c.g,this.b-c.b)} mul(c){return new GameRGBColor(this.r*c.r,this.g*c.g,this.b*c.b)} div(c){return new GameRGBColor(c.r===0?0:this.r/c.r,c.g===0?0:this.g/c.g,c.b===0?0:this.b/c.b)}
  addEq(c){this.r+=c.r;this.g+=c.g;this.b+=c.b;return this} subEq(c){this.r-=c.r;this.g-=c.g;this.b-=c.b;return this} mulEq(c){this.r*=c.r;this.g*=c.g;this.b*=c.b;return this} divEq(c){this.r=c.r===0?0:this.r/c.r;this.g=c.g===0?0:this.g/c.g;this.b=c.b===0?0:this.b/c.b;return this}
  lerp(c,n){return new GameRGBColor(this.r+(c.r-this.r)*n,this.g+(c.g-this.g)*n,this.b+(c.b-this.b)*n)} equals(c){return Math.abs(this.r-c.r)<EPSILON&&Math.abs(this.g-c.g)<EPSILON&&Math.abs(this.b-c.b)<EPSILON} clone(){return new GameRGBColor(this.r,this.g,this.b)} toRGBA(){return new GameRGBAColor(this.r,this.g,this.b,1)} toString(){return `{ r:${this.r}, g:${this.g}, b:${this.b} }`}
}

export class GameRGBAColor {
  constructor(r, g, b, a) { this.r = r; this.g = g; this.b = b; this.a = a; }
  set(r,g,b,a){this.r=r;this.g=g;this.b=b;this.a=a;return this} copy(c){return this.set(c.r,c.g,c.b,c.a)}
  add(c){return new GameRGBAColor(this.r+c.r,this.g+c.g,this.b+c.b,this.a+c.a)} sub(c){return new GameRGBAColor(this.r-c.r,this.g-c.g,this.b-c.b,this.a-c.a)} mul(c){return new GameRGBAColor(this.r*c.r,this.g*c.g,this.b*c.b,this.a*c.a)} div(c){return new GameRGBAColor(c.r===0?0:this.r/c.r,c.g===0?0:this.g/c.g,c.b===0?0:this.b/c.b,c.a===0?0:this.a/c.a)}
  addEq(c){this.r+=c.r;this.g+=c.g;this.b+=c.b;this.a+=c.a;return this} subEq(c){this.r-=c.r;this.g-=c.g;this.b-=c.b;this.a-=c.a;return this} mulEq(c){this.r*=c.r;this.g*=c.g;this.b*=c.b;this.a*=c.a;return this} divEq(c){this.r=c.r===0?0:this.r/c.r;this.g=c.g===0?0:this.g/c.g;this.b=c.b===0?0:this.b/c.b;this.a=c.a===0?0:this.a/c.a;return this}
  lerp(c,n){return new GameRGBAColor(this.r+(c.r-this.r)*n,this.g+(c.g-this.g)*n,this.b+(c.b-this.b)*n,this.a+(c.a-this.a)*n)} blendEq(rgb){const c=1-this.a;return new GameRGBColor(c*rgb.r+this.a*this.r,c*rgb.g+this.a*this.g,c*rgb.b+this.a*this.b)} equals(c){return Math.abs(this.r-c.r)<EPSILON&&Math.abs(this.g-c.g)<EPSILON&&Math.abs(this.b-c.b)<EPSILON&&Math.abs(this.a-c.a)<EPSILON} clone(){return new GameRGBAColor(this.r,this.g,this.b,this.a)} toString(){return `{ r:${this.r}, g:${this.g}, b:${this.b}, a:${this.a} }`}
}
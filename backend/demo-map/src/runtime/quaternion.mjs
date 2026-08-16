import { Vector3 } from "./vector3.mjs";

const EPSILON = 1e-6;

export class GameQuaternion {
  static rotationBetween(a, b) { const dot = a.dot(b); if (dot < -0.999999) { let axis = new a.constructor(1, 0, 0).cross(a); if (axis.mag() < EPSILON) axis = new a.constructor(0, 1, 0).cross(a); return GameQuaternion.fromAxisAngle(axis.normalize(), Math.PI); } if (dot > 0.999999) return new GameQuaternion(1, 0, 0, 0); const axis = a.cross(b); return new GameQuaternion(1 + dot, axis.x, axis.y, axis.z).normalize(); }
  static fromAxisAngle(axis, radians) { const half = radians * 0.5, scale = Math.sin(half); return new GameQuaternion(Math.cos(half), scale * axis.x, scale * axis.y, scale * axis.z); }
  static fromEuler(x, y, z) { const f = 0.5 * Math.PI / 180; x *= f; y *= f; z *= f; const sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z); return new GameQuaternion(cx*cy*cz+sx*sy*sz,sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz); }
  constructor(w, x, y, z) { this.w=w; this.x=x; this.y=y; this.z=z; }
  set(w,x,y,z){this.w=w;this.x=x;this.y=y;this.z=z;return this} copy(q){return this.set(q.w,q.x,q.y,q.z)}
  getAxisAngle(quaternion){const q=quaternion.normalize(),angle=Math.acos(q.w)*2,s=Math.sin(angle/2);return {axis:s>EPSILON?new Vector3(q.x/s,q.y/s,q.z/s):new Vector3(1,0,0),angle}}
  rotateX(r){const h=r*.5,b=Math.sin(h),c=Math.cos(h);return new GameQuaternion(this.w*c-this.x*b,this.x*c+this.w*b,this.y*c+this.z*b,this.z*c-this.y*b)}
  rotateY(r){const h=r*.5,b=Math.sin(h),c=Math.cos(h);return new GameQuaternion(this.w*c-this.y*b,this.x*c-this.z*b,this.y*c+this.w*b,this.z*c+this.x*b)}
  rotateZ(r){const h=r*.5,b=Math.sin(h),c=Math.cos(h);return new GameQuaternion(this.w*c-this.z*b,this.x*c+this.y*b,this.y*c-this.x*b,this.z*c+this.w*b)}
  dot(q){return this.w*q.w+this.x*q.x+this.y*q.y+this.z*q.z} add(q){return new GameQuaternion(this.w+q.w,this.x+q.x,this.y+q.y,this.z+q.z)} sub(q){return new GameQuaternion(this.w-q.w,this.x-q.x,this.y-q.y,this.z-q.z)} angle(q){const d=this.dot(q);return Math.acos(2*d*d-1)}
  mul(q){const {w:aw,x:ax,y:ay,z:az}=this,{w:bw,x:bx,y:by,z:bz}=q;return new GameQuaternion(aw*bw-ax*bx-ay*by-az*bz,ax*bw+aw*bx+ay*bz-az*by,ay*bw+aw*by+az*bx-ax*bz,az*bw+aw*bz+ax*by-ay*bx)}
  inv(){const d=this.dot(this),r=Math.abs(d)>EPSILON?1/d:d;return new GameQuaternion(this.w*r,-this.x*r,-this.y*r,-this.z*r)} div(q){return this.mul(q.inv())}
  slerp(q,n){let {w:bw,x:bx,y:by,z:bz}=q;const {w:aw,x:ax,y:ay,z:az}=this;let c=ax*bx+ay*by+az*bz+aw*bw;if(c<0){c=-c;bx=-bx;by=-by;bz=-bz;bw=-bw}let a,b;if(1-c>EPSILON){const o=Math.acos(c),s=Math.sin(o);a=Math.sin((1-n)*o)/s;b=Math.sin(n*o)/s}else{a=1-n;b=n}return new GameQuaternion(a*aw+b*bw,a*ax+b*bx,a*ay+b*by,a*az+b*bz)}
  mag(){return Math.sqrt(this.dot(this))} sqrMag(){return this.dot(this)} normalize(){let r=this.dot(this);if(r>0)r=1/Math.sqrt(r);return new GameQuaternion(r*this.w,r*this.x,r*this.y,r*this.z)} equals(q){return Math.abs(this.w-q.w)<EPSILON&&Math.abs(this.x-q.x)<EPSILON&&Math.abs(this.y-q.y)<EPSILON&&Math.abs(this.z-q.z)<EPSILON} clone(){return new GameQuaternion(this.w,this.x,this.y,this.z)} toString(){return `{ w:${this.w}, x:${this.x}, y:${this.y}, z:${this.z} }`}
}

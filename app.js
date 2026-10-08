(function(){'use strict';
var T=window.THREE,$=function(s){return document.querySelector(s)},B=document.body;
var low=matchMedia('(max-width:700px)').matches||(navigator.hardwareConcurrency||8)<=4,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function nogl(){B.classList.remove('load');B.classList.add('nogl');}
var rd;try{rd=new T.WebGLRenderer({canvas:$('#gl'),antialias:!low,alpha:true,powerPreference:'high-performance'});}catch(e){nogl();return;}
rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=1.05;
$('#gl').addEventListener('webglcontextlost',function(e){e.preventDefault();nogl();});
var scene=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.1,100);cam.position.z=9;
var sys=new T.Group(),pp=new T.Group(),rp=new T.Group();scene.add(sys);sys.add(pp,rp);pp.scale.setScalar(1.2);rp.rotation.order='ZXY';

/* ---------- GLSL ---------- */
var NOISE='float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}\
vec3 h33(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}\
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}\
float fbm(vec3 p,int n){float a=.5,s=0.;for(int i=0;i<6;i++){if(i>=n)break;s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}\
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}';
/* общие данные света и колец: тени колец на планете и планеты на кольцах */
var SHARED='uniform vec3 uPC,uN,uL;uniform float uR;\
float ringDens(float r){float b=.5+.28*sin(r*74.)+.22*vn(vec3(r*41.,3.1,1.7))+.2*(vn(vec3(r*170.,9.,2.))-.5);\
b*=smoothstep(1.28,1.45,r)*(1.-smoothstep(2.12,2.3,r));b*=smoothstep(.008,.035,abs(r-1.86));b*=smoothstep(.004,.016,abs(r-2.07));b*=mix(.4,1.,smoothstep(1.3,1.75,r));return clamp(b,0.,1.);}\
float planetLit(vec3 w){vec3 oc=uPC-w;float t=dot(oc,uL);if(t<0.)return 1.;float d=sqrt(max(dot(oc,oc)-t*t,0.));return smoothstep(uR*.97,uR*1.04,d);}\
float ringShadow(vec3 w){float dn=dot(uL,uN);if(abs(dn)<.001)return 1.;vec3 d=w-uPC;float t=-dot(d,uN)/dn;if(t<0.)return 1.;float r=length(d+uL*t)/uR;return 1.-ringDens(r)*.9;}';
var TERR='uniform vec3 uSeed;uniform float uCr,uDisp,uSpin;\
float craters(vec3 p,float sc,float dens){vec3 q=p*sc,i=floor(q),f=fract(q);float h=0.;\
for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(x,y,z),id=i+g;if(h31(id+3.3)>dens)continue;\
vec3 c=g+.2+h33(id)*.6-f;float rad=.25+.35*h31(id+7.7),d=length(c)/rad,dep=rad*.5;\
if(d<1.)h-=dep*(1.-pow(d,2.6));if(rad>.5)h+=dep*.35*exp(-d*d*30.);h+=dep*.55*exp(-pow((d-1.05)/.2,2.));if(d>1.)h+=dep*.08*exp(-(d-1.)*2.5);}return h;}\
float Hl(vec3 p){p+=uSeed;float b=fbm(p*2.1,4),m=smoothstep(.5,.7,fbm(p*1.3+9.,3)),rg=1.-abs(vn(p*6.)*2.-1.);return b*.6+m*rg*rg*.4+craters(p,uCr,.5)*1.1;}\
float Hf(vec3 p){float h=Hl(p);\n#ifdef HQ\nh+=craters(p+uSeed+3.7,uCr*2.9,.45)*.6;\n#endif\nreturn h+(fbm(p*9.,3)-.5)*.14+(fbm(p*34.,FO)-.5)*.1;}';
var PV=NOISE+TERR+'varying vec3 vO,vW,vNg;void main(){vec3 d=normalize(position);vO=d;float h=Hl(rotY(d,uSpin));vec3 w=(modelMatrix*vec4(d*(1.+h*uDisp),1.)).xyz;vW=w;vNg=mat3(modelMatrix)*d;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}';
var PF=NOISE+SHARED+TERR+'varying vec3 vO,vW,vNg;uniform float uBump,uCut,uFrost,uRS;uniform mat3 uNM;uniform vec3 uC0,uC1,uC2,uC3,uSun,uAmb,uAtm;\
void main(){if(min(vO.x,min(vO.y,vO.z))>uCut)discard;\
vec3 p=rotY(normalize(vO),uSpin);vec3 t=normalize(cross(p,abs(p.y)>.95?vec3(1,0,0):vec3(0,1,0))),b=cross(p,t);float e=.0025;\
float h0=Hf(p),ht=Hf(normalize(p+t*e)),hb=Hf(normalize(p+b*e));\
vec3 n=normalize(p-uBump*uDisp*((ht-h0)/e*t+(hb-h0)/e*b));vec3 nw=normalize(uNM*rotY(n,-uSpin));\
vec3 q=p+uSeed;float m=fbm(q*3.+4.,4),base=fbm(q*2.1,4);\
vec3 col=mix(uC0,uC1,smoothstep(.38,.6,m));col=mix(col,uC2,smoothstep(.55,.75,fbm(q*7.,3))*.8);\
col=mix(col,uC3,(1.-smoothstep(.34,.43,base))*(.25+.5*vn(q*14.))*.7);\
col*=mix(.55,1.3,clamp(h0*1.7+.3,0.,1.));col*=.7+.6*fbm(q*22.,3);col*=.88+.24*vn(q*90.);col*=1.+.06*sin(h0*60.+m*8.);\
col=mix(col,vec3(.8,.84,.85),smoothstep(.86,.99,abs(p.y)+(fbm(q*5.,3)-.5)*.14)*uFrost*.85);\
vec3 V=normalize(cameraPosition-vW),ng=normalize(vNg);float gl=dot(ng,uL),diff=max(dot(nw,uL),0.)*smoothstep(-.12,.22,gl);\
float sh=uRS>.5?ringShadow(vW):1.;float ao=.45+.55*smoothstep(-.4,.2,h0);\
float lim=pow(1.-max(dot(ng,V),0.),3.);\
vec3 c=col*(uSun*diff*sh+uAmb*(.5+.5*gl)*ao);\
c+=uAtm*lim*smoothstep(-.35,.5,gl)*.32*step(.5,uRS);\
c+=vec3(1.,.42,.18)*exp(-pow(gl/.13,2.))*lim*.5*step(.5,uRS);\
gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
var AV='varying vec3 vN,vW;void main(){vN=mat3(modelMatrix)*normal;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
var AF='uniform vec3 uL,uAtm;uniform float uAmt;varying vec3 vN,vW;void main(){vec3 n=normalize(vN),V=normalize(cameraPosition-vW);float i=pow(clamp(-dot(n,V)/.52,0.,1.),2.6),l=dot(n,uL);\
vec3 c=mix(vec3(1.,.5,.22),uAtm,smoothstep(-.1,.45,l))*i*smoothstep(-.45,.4,l)*uAmt*.75;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
var RV='varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
var RF=NOISE+SHARED+'varying vec3 vW;uniform float uRA;uniform vec3 uSun;void main(){vec3 d=vW-uPC;float r=length(d-dot(d,uN)*uN)/uR,dn=ringDens(r);if(dn<.01)discard;\
float lit=planetLit(vW);vec3 V=normalize(cameraPosition-vW);float c=vn(vec3(r*55.,2.,5.));\
vec3 col=mix(vec3(.4,.31,.24),vec3(.86,.75,.58),clamp(c*.8+.15*sin(r*40.)+.25,0.,1.));\
float face=abs(dot(uL,uN)),same=dot(V,uN)*dot(uL,uN)>0.?1.:.4;\
vec3 o=col*uSun*lit*(.2+1.5*face)*same*.5+col*.03;o+=vec3(1.,.8,.55)*pow(max(dot(-V,uL),0.),6.)*.15*lit*dn;\
gl_FragColor=vec4(o,dn*uRA*.92);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
var KV='varying vec3 vW,vN;void main(){mat4 m=modelMatrix*instanceMatrix;vW=(m*vec4(position,1.)).xyz;vN=normalize(mat3(m)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}';
var KF=NOISE+SHARED+'varying vec3 vW,vN;uniform float uRA;uniform vec3 uSun;void main(){if(uRA<.5)discard;float l=max(dot(normalize(vN),uL),0.)*planetLit(vW);\
gl_FragColor=vec4(vec3(.36,.29,.24)*(uSun*l*.9+.03),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
var CV='uniform vec3 uMask;uniform float uC;varying vec3 vQ;void main(){vec3 q=position*(1.-uMask)+uMask*uC;vQ=q;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(q,1.);}';
var CF=NOISE+'varying vec3 vQ;uniform float uC;void main(){if(min(vQ.x,min(vQ.y,vQ.z))<uC-.003||length(vQ)>1.)discard;\
float r=length(vQ),s=fbm(vQ*7.,4),w=fbm(vQ*18.+3.,3);\
vec3 col=r>.93?vec3(.2,.14,.11)*(.7+s*.8):r>.55?mix(vec3(.5,.14,.06),vec3(.95,.38,.1),(1.-smoothstep(.55,.93,r))*.6+s*.5):r>.3?vec3(1.,.55,.14)*(1.1+w*.6):vec3(1.,.88,.55)*2.2;\
float ln=1.-smoothstep(0.,.012,min(min(abs(r-.93),abs(r-.55)),abs(r-.3)));col=mix(col,vec3(.04,.02,.01),ln*.75);\
col+=vec3(1.,.5,.15)*.35/(.4+r*5.);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';

/* ---------- общие uniform'ы ---------- */
var S={uL:{value:new T.Vector3(-.5,.4,.8)},uPC:{value:new T.Vector3()},uN:{value:new T.Vector3(0,0,1)},uR:{value:1.2},
uSun:{value:new T.Color(3.1,2.6,2)},uAmb:{value:new T.Color(.09,.11,.17)},uAtm:{value:new T.Color(.3,.55,1)},uRA:{value:1}};
var WARM=new T.Color(3.1,2.6,2),COLD=new T.Color(2.3,2.7,3.4),cold=0,coldT=0;
function terrain(o){var u={uNM:{value:new T.Matrix3()},uSeed:{value:new T.Vector3(o.s,o.s*.7,o.s*1.3)},uCr:{value:o.cr},uDisp:{value:o.disp},uBump:{value:o.bump},uSpin:{value:0},uCut:{value:2},uFrost:{value:o.frost},uRS:{value:o.rs},
uC0:{value:new T.Color(o.c[0])},uC1:{value:new T.Color(o.c[1])},uC2:{value:new T.Color(o.c[2])},uC3:{value:new T.Color(o.c[3])}};
var d={FO:low?3:4};if(!low)d.HQ=1;return new T.ShaderMaterial({uniforms:Object.assign(u,S),vertexShader:PV,fragmentShader:PF,defines:d});}
var seg=low?96:176,planetMat=terrain({s:3.1,cr:5.5,disp:.055,bump:3.2,frost:1,rs:1,c:[0x2a2120,0x8a4f2e,0xc99b63,0x7a8c7e]});
var planet=new T.Mesh(new T.SphereGeometry(1,seg,seg*.6|0),planetMat);planet.frustumCulled=false;pp.add(planet);
var atm=new T.Mesh(new T.SphereGeometry(1.17,96,64),new T.ShaderMaterial({uniforms:Object.assign({uAmt:{value:1}},S),vertexShader:AV,fragmentShader:AF,side:T.BackSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));atm.renderOrder=3;pp.add(atm);
/* разрез: три грани выбранного октанта, цвет по радиусу */
var planes=[],cutMat=[[1,0,0],[0,1,0],[0,0,1]].map(function(m,k){var g=new T.PlaneGeometry(2.4,2.4);if(k===0)g.rotateY(Math.PI/2);if(k===1)g.rotateX(-Math.PI/2);
var mt=new T.ShaderMaterial({uniforms:{uMask:{value:new T.Vector3(m[0],m[1],m[2])},uC:{value:1}},vertexShader:CV,fragmentShader:CF,side:T.DoubleSide});var me=new T.Mesh(g,mt);me.visible=false;me.frustumCulled=false;pp.add(me);planes.push(me);return mt;});
/* кольца + каменные обломки */
var ringMat=new T.ShaderMaterial({uniforms:S,vertexShader:RV,fragmentShader:RF,transparent:true,side:T.DoubleSide,depthWrite:false});var ring=new T.Mesh(new T.RingGeometry(1.56,2.76,256,2),ringMat);ring.renderOrder=2;ring.frustumCulled=false;rp.add(ring);
var seed=7;function rnd(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}
var NR=low?300:900,rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.ShaderMaterial({uniforms:S,vertexShader:KV,fragmentShader:KF}),NR),tmp=new T.Object3D();
for(var i=0;i<NR;i++){var a=rnd()*6.283,r=1.68+rnd()*.95,sz=.005+Math.pow(rnd(),4)*.03;tmp.position.set(Math.cos(a)*r,Math.sin(a)*r,(rnd()-.5)*.03);tmp.rotation.set(rnd()*6,rnd()*6,rnd()*6);tmp.scale.set(sz,sz*.7,sz*.85);tmp.updateMatrix();rocks.setMatrixAt(i,tmp.matrix);}
rocks.frustumCulled=false;rp.add(rocks);
/* спутники — тот же шейдер рельефа */
var moons=[{r:.2,or:3.1,ph:.9,sp:1,inc:.35,m:terrain({s:11,cr:7,disp:.07,bump:3.2,frost:0,rs:0,c:[0x2f3238,0x666a70,0x9a9ca0,0x56606a]})},
{r:.11,or:2.8,ph:3.6,sp:-1.5,inc:-.55,m:terrain({s:23,cr:6,disp:.07,bump:3.2,frost:0,rs:0,c:[0x3d2c20,0x8f6b3e,0xcdb27a,0x7d6d4a]})}].map(function(d){d.mesh=new T.Mesh(new T.SphereGeometry(1,64,40),d.m);d.mesh.frustumCulled=false;sys.add(d.mesh);return d;});
/* звёзды */
var sp=[],sc=[],col=new T.Color();for(var j=0;j<(low?500:1400);j++){var th=rnd()*6.283,ph=Math.acos(rnd()*2-1),rr=40+rnd()*20;sp.push(rr*Math.sin(ph)*Math.cos(th),rr*Math.cos(ph),-Math.abs(rr*Math.sin(ph)*Math.sin(th))-8);col.setHSL(.08+rnd()*.5,.3,.4+rnd()*.5);sc.push(col.r,col.g,col.b);}
var sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(sp,3));sg.setAttribute('color',new T.Float32BufferAttribute(sc,3));
var stars=new T.Points(sg,new T.PointsMaterial({vertexColors:true,size:1.6,sizeAttenuation:false,transparent:true,opacity:.75,depthWrite:false}));scene.add(stars);

/* ---------- сценарий скролла ---------- */
/* x (доля половины ширины), y, масштаб, rx, ry, rz, наклон колец, крен колец, кольца, разрез, спутники, азимут света */
var POSES=[[0,-.1,1.45,.25,-.5,.1,1.15,.35,1,0,1,.85],[.55,-2.75,3.3,.5,.9,0,1.1,.35,0,0,0,.5],[-.42,.1,1.15,.12,2,0,.55,-.25,1,0,1,1.05],[.42,-.1,1.75,0,0,0,1.2,0,0,1,0,.6],[0,.2,.95,.1,-1.2,0,.9,.1,1,0,1,2.25],[0,-.1,1.5,.2,.4,0,1,.25,1,0,1,.8]];
var NAMES=['Первый контакт','Поверхность','Кольца','Ядро','Спутники','Обзор'];
var secs=[].slice.call(document.querySelectorAll('.ch')),tx=[].slice.call(document.querySelectorAll('.tx')),cen=[],target=0,prog=0,cut=0,rings=1,moonA=1,ov={rings:true,cut:false},vh=innerHeight,lastCh=-1,sv=0;
function sm(a,b,x){x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);}
function measure(){vh=innerHeight;cen=secs.map(function(s){return s.offsetTop+s.offsetHeight/2;});}
function onScroll(){var m=scrollY+vh/2,i=0;while(i<5&&m>cen[i+1])i++;var f=i<5?sm(.18,.82,(m-cen[i])/(cen[i+1]-cen[i])):0;target=Math.max(0,Math.min(5,i+Math.max(0,f)));if(m<cen[0])target=0;
var ch=Math.round(target);if(ch!==lastCh){lastCh=ch;$('#cap').textContent=NAMES[ch];}$('#pct').textContent=Math.round(target/5*100)+'%';
tx.forEach(function(e){var r=e.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-vh/2)/vh;e.style.opacity=1-sm(.22,.55,d);e.style.transform='translateY('+((r.top+r.height/2-vh/2)*.06).toFixed(1)+'px)';});}
addEventListener('scroll',onScroll,{passive:true});
function resize(){var pr=Math.min(devicePixelRatio||1,low?1:1.6);rd.setPixelRatio(pr);rd.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();measure();onScroll();}
addEventListener('resize',resize);
/* управление */
function tog(id,key,fn){$(id).addEventListener('click',function(){ov[key]=!ov[key];fn(this);});}
tog('#bRings','rings',function(b){b.setAttribute('aria-pressed',ov.rings);});
tog('#bCut','cut',function(b){b.setAttribute('aria-pressed',ov.cut);});
$('#bLight').addEventListener('click',function(){coldT=coldT?0:1;this.setAttribute('aria-pressed',!!coldT);this.textContent='Свет: '+(coldT?'холодный':'тёплый');});
var mx=0,my=0,drag=null,dX=0,dY=0,vX=0,vY=0;
addEventListener('pointermove',function(e){mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1;if(drag){var dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;vY=dx*.006;vX=dy*.004;dY+=vY;dX=Math.max(-.9,Math.min(.9,dX+vX));}});
addEventListener('pointerdown',function(e){if(e.target.closest('a,button,header'))return;drag={x:e.clientX,y:e.clientY};});
addEventListener('pointerup',function(){drag=null;});addEventListener('pointercancel',function(){drag=null;});

/* ---------- кадр ---------- */
var qA=new T.Quaternion(),qD=new T.Quaternion(),eu=new T.Euler(0,0,0,'YXZ'),eu2=new T.Euler(),
qCore=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,1,1).normalize(),new T.Vector3(.1,.18,1).normalize()),v3=new T.Vector3(),
prev=0,t0=0,spinX=0,ema=.016,g=[],root=document.documentElement;
function frame(t){requestAnimationFrame(frame);if(!t0)t0=t;var dt=Math.min((t-prev)/1000||.016,.05);prev=t;ema+=(dt-ema)*.05;
var ease=reduced?1:1-Math.exp(-dt*4.5),e2=reduced?1:1-Math.exp(-dt*3);prog+=(target-prog)*ease;var vel=target-prog;
var i=Math.min(4,Math.floor(prog)),f=prog-i,a=POSES[i],b=POSES[i+1];for(var k=0;k<12;k++)g[k]=a[k]+(b[k]-a[k])*f;
var inEx=sm(4.3,4.8,prog),cutT=Math.max(g[9],ov.cut?inEx:0),ringT=g[8]*(ov.rings?1:1-inEx);
cut+=(cutT-cut)*e2;rings+=(ringT-rings)*e2;moonA+=(g[10]*(1-cut)-moonA)*e2;cold+=(coldT-cold)*e2;
var it=reduced?1:Math.min(1,(t-t0)/2800),ie=1-Math.pow(1-it,3);
var asp=innerWidth/innerHeight,hh=Math.tan(cam.fov*.0087266)*cam.position.z,hw=hh*asp,por=asp<.9,x=por?0:g[0]*hw,y=por?1.15+g[1]*.15:g[1],s=g[2]*(por?.62:1)*(.62+.38*ie);
sys.position.set(x,y,0);sys.scale.setScalar(s);
eu.set(g[3],g[4],g[5]);qA.setFromEuler(eu).slerp(qCore,cut);
if(!drag){vY*=.92;vX*=.92;dY+=vY*.5;dX*=.985;dY*=.99;}qD.setFromEuler(eu2.set(dX,dY,0));pp.quaternion.copy(qD).multiply(qA);
rp.rotation.set(g[6],0,g[7]);
var az=g[11];S.uL.value.set(-Math.sin(az),.38,Math.cos(az)).normalize();
S.uSun.value.lerpColors(WARM,COLD,cold);S.uAtm.value.setRGB(.3-cold*.1,.55,1);
sys.updateMatrixWorld(true);S.uPC.value.copy(sys.position);S.uR.value=1.2*s;S.uN.value.set(0,0,1).applyQuaternion(rp.quaternion);S.uRA.value=rings;
ring.visible=rocks.visible=rings>.01;
spinX+=vel*dt*5;var spin=(reduced?0:t*.00004)+prog*1.7+spinX;
planetMat.uniforms.uSpin.value=spin;planetMat.uniforms.uNM.value.setFromMatrix4(planet.matrixWorld);planetMat.uniforms.uCut.value=cut<.004?2:1-cut;
planes.forEach(function(p){p.visible=cut>.004;});cutMat.forEach(function(m){m.uniforms.uC.value=1-cut;});
atm.material.uniforms.uAmt.value=(1-cut*.92)*ie;
moons.forEach(function(d,n){var an=d.ph+t*.00022*d.sp+prog*.55*d.sp,or=d.or,sz=d.r*moonA;d.mesh.visible=moonA>.02;d.mesh.position.set(Math.cos(an)*or,Math.sin(an)*or*Math.sin(d.inc),Math.sin(an)*or*Math.cos(d.inc));d.mesh.scale.setScalar(Math.max(sz,.001));d.m.uniforms.uSpin.value=spin*(n?-1.8:1.3)+n;d.m.uniforms.uNM.value.setFromMatrix4(d.mesh.matrixWorld);});
cam.position.x+=(mx*.3-cam.position.x)*.05;cam.position.y+=(-my*.18-cam.position.y)*.05;cam.lookAt(0,0,0);cam.rotateZ(vel*.012);
stars.rotation.y=prog*.06;stars.position.y=-prog*.7;
v3.copy(sys.position).project(cam);root.style.setProperty('--px',((v3.x*.5+.5)*100).toFixed(1)+'%');root.style.setProperty('--py',((-v3.y*.5+.5)*100).toFixed(1)+'%');
var w=$('#word'),p0=Math.min(prog,1);w.style.transform='translateY(-52%) scale('+(1+p0*.22).toFixed(3)+')';if(!B.classList.contains('load'))w.style.opacity=1-sm(0,.8,prog);
rd.render(scene,cam);
if(t-t0>3000&&ema>.034&&rd.getPixelRatio()>.7){rd.setPixelRatio(rd.getPixelRatio()*.85);rd.setSize(innerWidth,innerHeight,false);ema=.016;}}
resize();requestAnimationFrame(function(t){frame(t);setTimeout(function(){B.classList.remove('load');},120);});
})();

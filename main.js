// Generated from src/ by build.cjs. Private Reader 0.1.0.
const __modules={};
__modules.core=(()=>{const module={exports:{}};
'use strict';
function safeName(name) {
  if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/\u0000-\u001f\u007f]/.test(name))throw new Error('不安全的云端文件名，已阻止。');
  return name;
}
function protectedPath(path,configDir='.obsidian') {
  const p=path.toLowerCase(),config=configDir.toLowerCase();
  return p===config||p.startsWith(config+'/')||['.obsidian','.git','.trash'].some(d=>p===d||p.startsWith(d+'/'))||/(^|\/)(\.ds_store|thumbs\.db)$/i.test(path)||/\.(tmp|temp)$/i.test(path)||path.split('/').some(n=>n.startsWith('~$')||/^\.pvm-/i.test(n));
}
function sha256Fallback(buffer) {
  const bytes=new Uint8Array(buffer),k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),length=Math.ceil((bytes.length+9)/64)*64;
  const r=(v,n)=>(v>>>n)|(v<<(32-n));
  for(let offset=0;offset<length;offset+=64) {
    for(let j=0;j<16;j++) {
      let value=0;
      for(let b=0;b<4;b++) {
        const index=offset+j*4+b;let byte=index<bytes.length?bytes[index]:index===bytes.length?128:0;
        if(index>=length-8){const bits=bytes.length*8;byte=index<length-4?(Math.floor(bits/4294967296)>>>((length-5-index)*8))&255:(bits>>>((length-1-index)*8))&255;}
        value=(value<<8)|byte;
      }
      w[j]=value>>>0;
    }
    for(let j=16;j<64;j++){const a=w[j-15],b=w[j-2];w[j]=(w[j-16]+(r(a,7)^r(a,18)^(a>>>3))+w[j-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,q]=h;
    for(let j=0;j<64;j++){const t1=(q+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[j]+w[j])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;q=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    [a,b,c,d,e,f,g,q].forEach((v,j)=>{h[j]=(h[j]+v)>>>0;});
  }
  return h.map(v=>v.toString(16).padStart(8,'0')).join('');
}
async function hash(buffer) {
  if(globalThis.crypto?.subtle){const bytes=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',buffer));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
  return sha256Fallback(buffer);
}
async function syncMirror({remote,local,manifest={},checkpoint=async()=>{},progress=()=>{},cancelled=()=>false,maxBytes=50*1024*1024,configDir='.obsidian',yieldUI=()=>new Promise(r=>setTimeout(r,0))}) {
  const stats={added:0,updated:0,unchanged:0,failed:0,skipped:0,folders:0,processed:0,errors:[]};
  const root=await remote.root(),identity=root.driveId+':'+root.id;
  if(manifest.identity&&manifest.identity!==identity)throw new Error('账号或应用文件夹已变化，请为新账号建立新的阅读 Vault。');
  const next={identity,entries:Object.assign(Object.create(null),manifest.entries||{})},visited=new Set();
  function check(){if(cancelled())throw new Error('同步已取消，已下载的文件保留。');}
  async function visit(id,prefix,depth) {
    check();if(depth>100||visited.has(id))throw new Error('云端目录结构异常，停止遍历。');visited.add(id);
    for await(const item of remote.children(id)) {
      check();let path;
      try {
        path=(prefix?prefix+'/':'')+safeName(item.name);
        if(protectedPath(path,configDir)){stats.skipped++;continue;}
        if(item.remoteItem)throw new Error('不跟随共享快捷方式。');
        progress({...stats,current:path});await yieldUI();
        if(item.folder){if(await local.ensureFolder(path))stats.folders++;await visit(item.id,path,depth+1);continue;}
        if(!item.file){stats.skipped++;continue;}
        const stamp=item.cTag||item.eTag;
        if(!stamp||!Number.isSafeInteger(item.size)||item.size<0)throw new Error('云端版本或文件大小缺失。');
        if(item.size>maxBytes)throw new Error('文件超过下载大小上限，可在设置中提高上限。');
        const exists=await local.exists(path),record=next.entries[path];
        if(exists&&record&&record.stamp===stamp&&record.hash===await hash(await local.read(path))){stats.unchanged++;continue;}
        const bytes=await remote.download(item);check();
        if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==item.size)throw new Error('下载不完整，保留原文件，请重试。');
        await local.write(path,bytes);
        next.entries[path]={stamp,hash:await hash(bytes)};
        if(exists)stats.updated++;else stats.added++;
        await checkpoint(next);
      } catch(error){if(cancelled())throw error;stats.failed++;stats.errors.push((path||'无效路径')+'：'+error.message);}
      finally{stats.processed++;progress({...stats,current:path||''});}
    }
  }
  await visit(root.id,'',0);await checkpoint(next);
  return {stats,manifest:next,root};
}
module.exports={safeName,protectedPath,sha256Fallback,hash,syncMirror};

return module.exports;})();
__modules.network=(()=>{const module={exports:{}};
'use strict';
const SCOPE='https://graph.microsoft.com/Files.ReadWrite.AppFolder offline_access';
const GRAPH='https://graph.microsoft.com/v1.0';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const form=values=>Object.entries(values).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
function graphURL(url) {
  const parsed=new URL(url);
  if(parsed.origin!=='https://graph.microsoft.com'||!parsed.pathname.startsWith('/v1.0/me/drive/')||parsed.username||parsed.password)throw new Error('拒绝向未知地址发送 Microsoft 凭据。');
  return parsed;
}
function downloadURL(url) {
  const parsed=new URL(url),host=parsed.hostname.toLowerCase();
  const allowed=['1drv.com','live.com','sharepoint.com','sharepointonline.com','onedrive.com','onedriveusercontent.com'];
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||!allowed.some(s=>host===s||host.endsWith('.'+s)))throw new Error('下载地址不属于受支持的 Microsoft 文件服务。');
  return parsed.href;
}
class DeviceAuth {
  constructor({request,clientId,onTokens=async()=>{},tokens=null,sleep=pause,now=()=>Date.now()}){Object.assign(this,{request,clientId,onTokens,tokens,sleep,now});}
  async post(endpoint,values){return this.request({url:'https://login.microsoftonline.com/consumers/oauth2/v2.0/'+endpoint,method:'POST',contentType:'application/x-www-form-urlencoded',body:form({client_id:this.clientId,...values}),throw:false});}
  async accept(response) {
    const json=response.json;
    if(!json?.access_token)throw new Error('Microsoft 未返回访问令牌，请重新登录。');
    if(json.scope&&!json.scope.split(' ').some(s=>s.endsWith('Files.ReadWrite.AppFolder')))throw new Error('缺少应用文件夹权限，请检查应用注册。');
    this.tokens={accessToken:json.access_token,refreshToken:json.refresh_token||this.tokens?.refreshToken||'',expiresAt:this.now()+Number(json.expires_in||3600)*1000};
    await this.onTokens(this.tokens);return this.tokens.accessToken;
  }
  async login(showCode,cancelled=()=>false) {
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.clientId))throw new Error('Client ID 格式不正确。');
    const response=await this.post('devicecode',{scope:SCOPE});
    if(response.status!==200)throw new Error('无法启动登录。请检查 Client ID、个人账号类型和公开客户端流设置。');
    const code=response.json;
    const verify=new URL(code.verification_uri);
    if(verify.protocol!=='https:'||!['microsoft.com','login.microsoftonline.com'].some(h=>verify.hostname===h||verify.hostname.endsWith('.'+h)))throw new Error('Microsoft 登录地址异常，已阻止。');
    if(!code.device_code||!code.user_code)throw new Error('Microsoft 登录响应不完整。');
    showCode({userCode:code.user_code,url:verify.href});
    const deadline=this.now()+Number(code.expires_in||900)*1000;
    let interval=Math.max(5,Number(code.interval||5));
    while(this.now()<deadline) {
      if(cancelled())throw new Error('登录已取消。');
      await this.sleep(interval*1000);
      if(cancelled())throw new Error('登录已取消。');
      const token=await this.post('token',{grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:code.device_code});
      if(token.status===200)return this.accept(token);
      const error=token.json?.error;
      if(error==='authorization_pending')continue;
      if(error==='slow_down'){interval+=5;continue;}
      if(error==='authorization_declined'||error==='access_denied')throw new Error('你取消了 Microsoft 授权。');
      if(error==='expired_token')break;
      throw new Error('登录失败，请检查 Microsoft 应用注册后重试。');
    }
    throw new Error('登录验证码已过期，请重新连接。');
  }
  async access(force=false) {
    if(!force&&this.tokens?.accessToken&&this.tokens.expiresAt>this.now()+60000)return this.tokens.accessToken;
    if(!this.tokens?.refreshToken)throw new Error('请先连接 OneDrive。');
    const response=await this.post('token',{grant_type:'refresh_token',refresh_token:this.tokens.refreshToken,scope:SCOPE});
    if(response.status!==200)throw new Error('登录已过期或被撤销，请重新连接 OneDrive。');
    return this.accept(response);
  }
}
class AppFolderGraph {
  constructor({request,auth,sleep=pause,cancelled=()=>false}){Object.assign(this,{request,auth,sleep,cancelled});this.allowedIds=new Set();}
  async get(url) {
    graphURL(url);
    let force=false;
    for(let attempt=0;attempt<4;attempt++) {
      if(this.cancelled())throw new Error('同步已取消。');
      const token=await this.auth.access(force);
      const response=await this.request({url,method:'GET',headers:{Authorization:'Bearer '+token},throw:false});
      if(response.status===200)return response.json;
      if(response.status===401&&!force){force=true;continue;}
      if([429,500,502,503,504].includes(response.status)&&attempt<3) {
        const retry=Number(response.headers?.['retry-after']||response.headers?.['Retry-After']);
        await this.sleep(Number.isFinite(retry)&&retry>0?Math.min(retry,60)*1000:(attempt+1)*1000);continue;
      }
      throw new Error('OneDrive 读取失败（HTTP '+response.status+'）。请检查网络、权限或重新登录。');
    }
    throw new Error('OneDrive 暂时不可用，请稍后重试。');
  }
  async root() {
    const root=await this.get(GRAPH+'/me/drive/special/approot');
    if(!root.id||!root.folder||!root.parentReference?.driveId)throw new Error('Microsoft 未返回有效的应用专用文件夹。');
    this.allowedIds.add(root.id);
    return {...root,driveId:root.parentReference.driveId};
  }
  async *children(id) {
    if(!this.allowedIds.has(id))throw new Error('不允许读取应用文件夹之外的目录。');
    const base=GRAPH+'/me/drive/items/'+encodeURIComponent(id)+'/children';
    let url=base;const pages=new Set();
    while(url) {
      if(pages.has(url))throw new Error('云端分页循环，已停止。');pages.add(url);
      if(graphURL(url).pathname!==new URL(base).pathname)throw new Error('云端分页指向其他目录，已阻止。');
      const page=await this.get(url);
      if(!Array.isArray(page.value))throw new Error('OneDrive 目录响应不完整。');
      for(const item of page.value) {
        if(!item.id)throw new Error('云端项目缺少 ID。');
        this.allowedIds.add(item.id);yield item;
      }
      url=page['@odata.nextLink']||'';
    }
  }
  async download(item) {
    if(!this.allowedIds.has(item.id))throw new Error('不允许下载应用文件夹之外的文件。');
    let url=item['@microsoft.graph.downloadUrl'];
    if(!url)url=(await this.get(GRAPH+'/me/drive/items/'+encodeURIComponent(item.id)))['@microsoft.graph.downloadUrl'];
    if(!url)throw new Error('文件没有可用的下载地址。');
    let response=await this.request({url:downloadURL(url),method:'GET',throw:false});
    // Download URLs carry their own short-lived permission: never attach the bearer token.
    if([401,403,404].includes(response.status)) {
      const fresh=await this.get(GRAPH+'/me/drive/items/'+encodeURIComponent(item.id));
      response=await this.request({url:downloadURL(fresh['@microsoft.graph.downloadUrl']),method:'GET',throw:false});
    }
    if(response.status!==200)throw new Error('文件下载失败（HTTP '+response.status+'），原文件保留。');
    return response.arrayBuffer;
  }
}
module.exports={SCOPE,GRAPH,graphURL,downloadURL,DeviceAuth,AppFolderGraph};

return module.exports;})();
__modules.main=(()=>{const module={exports:{}};
'use strict';
const {Plugin,PluginSettingTab,Setting,Modal,Notice,TFile,TFolder,MarkdownView,requestUrl}=require('obsidian');
const {syncMirror,hash}=__modules.core;
const {DeviceAuth,AppFolderGraph,downloadURL}=__modules.network;
const DEFAULTS={clientId:'b2a39a90-abb8-41e4-9e43-52d07fada54c',rememberLogin:false,readingMode:true,dedicatedVault:false,confirmedFolder:'',maxFileMB:50};
class ProgressModal extends Modal {
  constructor(app,title){super(app);this.title=title;this.cancelled=false;this.finished=false;}
  onOpen(){this.contentEl.createEl('h2',{text:this.title});this.status=this.contentEl.createEl('p',{text:'准备中…'});this.details=this.contentEl.createEl('pre',{cls:'private-reader-log'});new Setting(this.contentEl).addButton(b=>{this.button=b;b.setButtonText('取消').onClick(()=>{if(this.finished){this.close();return;}this.cancelled=true;this.status.setText('正在停止，请稍候…');});});}
  update(stats){this.status.setText('已检查 '+stats.processed+' 个项目 · '+(stats.current||''));this.details.setText('新增 '+stats.added+' · 更新 '+stats.updated+' · 未变化 '+stats.unchanged+'\n失败 '+stats.failed+' · 排除 '+stats.skipped+' · 新建文件夹 '+stats.folders);}
  done(text){this.finished=true;this.status.setText(text);this.button.setButtonText('关闭');}
  onClose(){if(!this.finished)this.cancelled=true;}
}
class LoginModal extends Modal {
  constructor(app){super(app);this.cancelled=false;this.finished=false;}
  onOpen(){this.contentEl.createEl('h2',{text:'连接 Microsoft OneDrive'});this.info=this.contentEl.createEl('p',{text:'正在获取验证码…'});this.code=this.contentEl.createEl('pre',{cls:'private-reader-code'});this.link=this.contentEl.createEl('a',{text:'打开 Microsoft 登录页面',attr:{target:'_blank',rel:'noopener noreferrer'}});this.link.style.display='none';this.contentEl.createEl('p',{text:'在网页输入验证码并授权后，回到 Obsidian，插件会自动检查登录结果。关闭此窗口会取消登录。'});}
  showCode({userCode,url}){this.info.setText('请复制验证码，在 Microsoft 官方页面完成登录。');this.code.setText(userCode);this.link.href=url;this.link.style.display='';}
  onClose(){if(!this.finished)this.cancelled=true;}
}
class ObsidianLocal {
  constructor(plugin){this.plugin=plugin;this.vault=plugin.app.vault;}
  async exists(path){const file=this.vault.getAbstractFileByPath(path);if(file&&!(file instanceof TFile))throw new Error('本地同名文件夹阻止写入。');return !!file;}
  async read(path){const file=this.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))throw new Error('本地文件不存在。');return this.vault.readBinary(file);}
  async ensureFolder(path){let created=false,current='';for(const part of path.split('/')){current+=(current?'/':'')+part;const existing=this.vault.getAbstractFileByPath(current);if(existing&&!(existing instanceof TFolder))throw new Error('本地同名文件阻止创建目录。');if(!existing){await this.vault.createFolder(current);created=true;}}return created;}
  async write(path,bytes){
    const parent=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';if(parent)await this.ensureFolder(parent);
    const existing=this.vault.getAbstractFileByPath(path);
    if(!existing){await this.vault.createBinary(path,bytes);return;}
    if(!(existing instanceof TFile))throw new Error('本地同名文件夹阻止更新。');
    const old=await this.vault.readBinary(existing);
    const backupDir=this.vault.configDir+'/plugins/'+this.plugin.manifest.id+'/backups';
    let backupParent='';
    for(const segment of backupDir.split('/')){backupParent+=(backupParent?'/':'')+segment;if(!await this.vault.adapter.exists(backupParent))await this.vault.adapter.mkdir(backupParent);}
    const backup=backupDir+'/'+await hash(new TextEncoder().encode(path).buffer)+'.bin';
    await this.vault.adapter.writeBinary(backup,old);
    try{await this.vault.modifyBinary(existing,bytes);}
    catch(error){try{await this.vault.modifyBinary(existing,old);}catch{throw new Error('写入和恢复均失败。原文件备份位于 '+backup);}throw error;}
    // Only remove our own temporary backup; never remove a note or attachment.
    try{await this.vault.adapter.remove(backup);}catch{/* A leftover backup is safe. */}
  }
}
class PrivateReader extends Plugin {
  async onload(){
    const stored=await this.loadData()||{};
    this.settings={...DEFAULTS,...stored.settings};
    this.state={manifest:stored.manifest||{},lastSync:stored.lastSync||'',lastResult:stored.lastResult||null,cloud:stored.cloud||null};
    this.busy=false;this.disposed=false;this.saveQueue=Promise.resolve();
    this.auth=this.makeAuth(this.settings.rememberLogin?stored.tokens:null);
    this.addSettingTab(new ReaderSettings(this.app,this));
    this.addRibbonIcon('download','Private Reader：立即同步',()=>this.safe(()=>this.runSync()));
    this.addCommand({id:'sync-now',name:'立即同步 OneDrive 镜像',callback:()=>this.safe(()=>this.runSync())});
    this.addCommand({id:'connect-onedrive',name:'连接 OneDrive',callback:()=>this.safe(()=>this.connect())});
    this.registerEvent(this.app.workspace.on('file-open',()=>this.readingMode()));
    this.app.workspace.onLayoutReady(()=>this.readingMode());
  }
  makeAuth(tokens=null){return new DeviceAuth({request:requestUrl,clientId:this.settings.clientId,tokens,onTokens:async()=>{if(!this.disposed)await this.persist();}});}
  persist(){this.saveQueue=this.saveQueue.catch(()=>{}).then(()=>this.saveData({settings:this.settings,...this.state,tokens:this.settings.rememberLogin?this.auth?.tokens:null}));return this.saveQueue;}
  async safe(action){try{await action();}catch(error){new Notice('Private Reader：'+error.message,10000);}}
  readingMode(){if(this.disposed||!this.settings.readingMode)return;const view=this.app.workspace.getActiveViewOfType(MarkdownView);if(view&&view.getMode()!=='preview')view.setState({...view.getState(),mode:'preview'},{}).catch(()=>{});}
  async connect(){
    if(this.busy)throw new Error('已有操作正在进行。');
    this.busy=true;const modal=new LoginModal(this.app);modal.open();
    try{
      this.auth=this.makeAuth();
      await this.auth.login(code=>modal.showCode(code),()=>modal.cancelled||this.disposed);
      if(this.disposed||modal.cancelled)throw new Error('登录已取消。');
      const graph=new AppFolderGraph({request:requestUrl,auth:this.auth});const root=await graph.root();
      this.state.cloud={id:root.id,driveId:root.driveId,name:root.name,webUrl:root.webUrl||''};
      this.settings.confirmedFolder='';await this.persist();
      modal.finished=true;modal.close();new Notice('OneDrive 已连接。请打开插件设置，核对微软应用文件夹，并确认专用阅读 Vault。',12000);
    }finally{this.busy=false;modal.finished=true;modal.close();}
  }
  async disconnect(){if(this.busy)throw new Error('请先等待或取消当前同步。');this.auth.tokens=null;this.state.cloud=null;this.settings.confirmedFolder='';await this.persist();new Notice('已清除本机登录信息，笔记保留。');}
  async runSync(){
    if(this.busy)throw new Error('已有操作正在进行。');
    if(!this.settings.dedicatedVault)throw new Error('请先在插件设置中确认当前是专用阅读 Vault。');
    const cloud=this.state.cloud;
    if(!cloud||this.settings.confirmedFolder!==cloud.driveId+':'+cloud.id)throw new Error('请先连接 OneDrive，并确认实际应用文件夹与电脑镜像相同。');
    const maxMB=Number(this.settings.maxFileMB);if(!Number.isFinite(maxMB)||maxMB<1||maxMB>200)throw new Error('下载大小上限须在 1–200 MB 之间。');
    this.busy=true;const modal=new ProgressModal(this.app,'下载 OneDrive 镜像');modal.open();
    try{
      const remote=new AppFolderGraph({request:requestUrl,auth:this.auth,cancelled:()=>modal.cancelled||this.disposed});
      const root=await remote.root();if(root.id!==cloud.id||root.driveId!==cloud.driveId)throw new Error('应用文件夹发生变化，请重新连接并核对。');
      const result=await syncMirror({remote,local:new ObsidianLocal(this),manifest:this.state.manifest,maxBytes:maxMB*1024*1024,configDir:this.app.vault.configDir,progress:stats=>modal.update(stats),cancelled:()=>modal.cancelled||this.disposed,checkpoint:async manifest=>{this.state.manifest=manifest;await this.persist();}});
      this.state.lastSync=new Date().toISOString();this.state.lastResult=result.stats;await this.persist();
      modal.update(result.stats);modal.done('完成：新增 '+result.stats.added+'，更新 '+result.stats.updated+'，未变化 '+result.stats.unchanged+'，失败 '+result.stats.failed+'。');
      if(result.stats.errors.length)modal.details.setText(modal.details.textContent+'\n\n'+result.stats.errors.slice(0,30).join('\n'));
      new Notice('Private Reader 下载完成'+(result.stats.failed?'，部分文件失败，可重试。':'。'));
    }catch(error){modal.done(error.message);throw error;}
    finally{this.busy=false;}
  }
  onunload(){this.disposed=true;this.auth.tokens=null;}
}
class ReaderSettings extends PluginSettingTab {
  constructor(app,plugin){super(app,plugin);this.reader=plugin;}
  display(){
    const {containerEl:el,reader:p}=this;el.empty();el.createEl('h2',{text:'Private Reader'});
    el.createEl('p',{text:'OneDrive → 当前 Vault。只在你点击同步时下载，不上传、不删除本地笔记。手机配置和插件不会被电脑配置覆盖。'});
    new Setting(el).setName('Microsoft Client ID').setDesc('公开的应用注册 ID；个人 Microsoft 账号，公开客户端流须启用。').addText(t=>t.setValue(p.settings.clientId).onChange(value=>p.safe(async()=>{if(p.busy)throw new Error('操作期间不能更改 Client ID。');p.settings.clientId=value.trim();p.auth=p.makeAuth();p.state.cloud=null;p.settings.confirmedFolder='';await p.persist();})));
    new Setting(el).setName('连接 OneDrive').setDesc(p.auth.tokens?'已有登录信息。':'尚未登录；验证码由 Microsoft 官方页面处理。').addButton(b=>b.setButtonText('连接').onClick(()=>p.safe(async()=>{await p.connect();this.display();}))).addButton(b=>b.setButtonText('退出').onClick(()=>p.safe(async()=>{await p.disconnect();this.display();})));
    new Setting(el).setName('在本机记住登录').setDesc('默认关闭：登录令牌仅存内存。开启后令牌以未加密形式保存在此 Vault 的插件 data.json，勿将该文件分享或同步给其他人。').addToggle(t=>t.setValue(p.settings.rememberLogin).onChange(value=>p.safe(async()=>{p.settings.rememberLogin=value;await p.persist();})));
    const cloud=p.state.cloud;
    if(cloud){
      el.createEl('h3',{text:'Microsoft 分配的实际应用文件夹'});el.createEl('p',{text:cloud.name});
      if(cloud.webUrl){try{const url=downloadURL(cloud.webUrl);el.createEl('a',{text:'在 OneDrive 中打开实际文件夹',attr:{href:url,target:'_blank',rel:'noopener noreferrer'}});}catch{el.createEl('p',{text:'云端链接无法验证，请在 OneDrive 中手动查找此应用文件夹。'});}}
      el.createEl('p',{text:'请核对电脑端镜像目标。Microsoft 可能新建应用目录，不能仅凭 Apps 下的同名文件夹认定两者相同。若目录不同，请在电脑端重新选择实际目录并同步，然后等待 OneDrive 上传完成。'});
      new Setting(el).setName('已核对电脑镜像使用此应用文件夹').addToggle(t=>t.setValue(p.settings.confirmedFolder===cloud.driveId+':'+cloud.id).onChange(value=>p.safe(async()=>{p.settings.confirmedFolder=value?cloud.driveId+':'+cloud.id:'';await p.persist();})));
    }
    new Setting(el).setName('当前是专用阅读 Vault').setDesc('请在 iPhone 新建单独 Vault 使用。下载会更新同路径笔记；手机改动不会上传，下一次同步会恢复云端镜像内容。').addToggle(t=>t.setValue(p.settings.dedicatedVault).onChange(value=>p.safe(async()=>{p.settings.dedicatedVault=value;await p.persist();})));
    new Setting(el).setName('打开笔记时默认阅读模式').setDesc('只是默认显示方式，不能从底层禁止 Obsidian 编辑。').addToggle(t=>t.setValue(p.settings.readingMode).onChange(value=>p.safe(async()=>{p.settings.readingMode=value;await p.persist();})));
    new Setting(el).setName('单文件下载上限（MB）').setDesc('默认 50 MB；超过上限会明确计为失败并保留原文件，允许范围 1–200 MB。').addText(t=>t.setValue(String(p.settings.maxFileMB)).onChange(value=>p.safe(async()=>{const n=Number(value);if(Number.isFinite(n)&&n>=1&&n<=200){p.settings.maxFileMB=n;await p.persist();}})));
    new Setting(el).setName('立即同步').setDesc(p.state.lastSync?'上次完成：'+new Date(p.state.lastSync).toLocaleString():'尚未完成同步。').addButton(b=>b.setButtonText('立即同步').setCta().onClick(()=>p.safe(async()=>{await p.runSync();this.display();})));
    if(p.state.lastResult){const s=p.state.lastResult;el.createEl('p',{text:'上次结果：新增 '+s.added+' · 更新 '+s.updated+' · 未变化 '+s.unchanged+' · 失败 '+s.failed+' · 排除 '+s.skipped});}
  }
}
module.exports=PrivateReader;
// Test hooks expose adapters without changing the plugin entry class.
module.exports.ObsidianLocal=ObsidianLocal;

return module.exports;})();
module.exports=__modules.main;

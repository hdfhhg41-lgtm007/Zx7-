import{C as e,t}from"./audioService-Di0tjGai.js";import{E as n,Kt as r,R as i,S as a,St as o,Ut as s,Y as c,Yt as l,hn as u,it as ee,m as te,n as ne,o as d,ot as f,sn as p,xn as m}from"./vendor-icons-DZbqKk2a.js";import{t as h}from"./vendor-react-AxaaaERR.js";import{C as g,D as _,E as re,L as ie,O as ae,T as v,_ as y,b,m as x,p as S,x as C}from"./index-ScwFs47L.js";var w=e(m(),1),T=h(),E=`/app/applet/src/components/NotificationsModal.tsx`,D=({isOpen:e,initialTab:m=`alerts`,onClose:h,language:D,voiceName:O=`Zephyr`,spokenConfig:k,onUpdateSpokenConfig:A,notifications:j,onSimulateIncomingAlert:M,onClearNotifications:N,onRepeatLastNotification:P,alwaysOnVoiceEnabled:F,onToggleAlwaysOnVoice:I,selectedPortraitId:L,onSelectPortrait:R})=>{let[z,B]=(0,w.useState)(m),[V,H]=(0,w.useState)(()=>x()),[U,W]=(0,w.useState)(null),[G,K]=(0,w.useState)(!1),[q,J]=(0,w.useState)(null),[Y,X]=(0,w.useState)(!1),[Z,oe]=(0,w.useState)(null),Q=(0,w.useRef)(null);if((0,w.useEffect)(()=>{e&&(B(m),H(x()),J(null))},[e,m]),!e)return null;let se=async()=>{t.unlock(),X(!0);try{let e=await ae(j,D,O,!0);oe({digestText:e.digestText,totalCount:e.totalCount,groupCount:e.groupCount}),e.audio?await t.playAudioBase64(e.audio,1,void 0,void 0,`WhatsApp Digest`):e.digestText&&await t.speakText(e.digestText,{language:D===`auto`?`urdu`:D,voiceName:O})}catch{J(`Could not generate WhatsApp group digest right now.`)}finally{X(!1)}},ce=async e=>{let t=e.target.files?.[0];if(e.target.value=``,t)try{let e=await ie(t,1080,.85),n=y(e.dataUrl),r=x();H(r),R(n.id),J(`Custom full-screen background saved and applied.`)}catch{J(`Could not read selected image — please choose a standard JPEG or PNG.`)}},le=()=>{let e=new Blob([b],{type:`text/plain;charset=utf-8`}),t=URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`Zara-Android-Native-Companion-Kotlin.txt`,document.body.appendChild(n),n.click(),window.setTimeout(()=>{URL.revokeObjectURL(t),n.remove()},500),J(`Downloaded Native Android Kotlin Companion setup file.`)},$=v();return(0,T.jsxDEV)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in`,children:[(0,T.jsxDEV)(`input`,{ref:Q,type:`file`,accept:`image/*`,onChange:ce,className:`hidden`},void 0,!1,{fileName:E,lineNumber:165,columnNumber:7},void 0),(0,T.jsxDEV)(`div`,{className:`w-full max-w-lg max-h-[90vh] bg-slate-950 border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col`,children:[(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-3 pb-3 border-b border-white/10`,children:[(0,T.jsxDEV)(`div`,{className:`min-w-0`,children:[(0,T.jsxDEV)(`h2`,{className:`text-base sm:text-lg font-bold text-white truncate`,children:`Spoken Alerts, HD Avatar & Android Permissions`},void 0,!1,{fileName:E,lineNumber:177,columnNumber:13},void 0),(0,T.jsxDEV)(`p`,{className:`text-xs text-slate-400 truncate`,children:`Incoming Call/Message Reader · Change Background · Privacy & OS Controls`},void 0,!1,{fileName:E,lineNumber:180,columnNumber:13},void 0)]},void 0,!0,{fileName:E,lineNumber:176,columnNumber:11},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:h,className:`min-h-[44px] min-w-[44px] rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer`,"aria-label":`Close`,children:(0,T.jsxDEV)(ne,{className:`w-5 h-5`},void 0,!1,{fileName:E,lineNumber:190,columnNumber:13},void 0)},void 0,!1,{fileName:E,lineNumber:184,columnNumber:11},void 0)]},void 0,!0,{fileName:E,lineNumber:175,columnNumber:9},void 0),(0,T.jsxDEV)(`div`,{className:`grid grid-cols-3 gap-1 p-1 mt-3 rounded-2xl bg-slate-900 border border-white/10`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>B(`alerts`),className:`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${z===`alerts`?`bg-pink-600 text-white shadow-sm`:`text-slate-300 hover:text-white`}`,children:`Spoken Alerts`},void 0,!1,{fileName:E,lineNumber:196,columnNumber:11},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>B(`avatar`),className:`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${z===`avatar`?`bg-pink-600 text-white shadow-sm`:`text-slate-300 hover:text-white`}`,children:`HD Avatar BG`},void 0,!1,{fileName:E,lineNumber:207,columnNumber:11},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>B(`android`),className:`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${z===`android`?`bg-pink-600 text-white shadow-sm`:`text-slate-300 hover:text-white`}`,children:`Permissions & OS`},void 0,!1,{fileName:E,lineNumber:218,columnNumber:11},void 0)]},void 0,!0,{fileName:E,lineNumber:195,columnNumber:9},void 0),q&&(0,T.jsxDEV)(`div`,{className:`mt-2.5 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-xs text-emerald-200`,children:q},void 0,!1,{fileName:E,lineNumber:232,columnNumber:11},void 0),(0,T.jsxDEV)(`div`,{className:`flex-1 overflow-y-auto py-3 space-y-4 pr-0.5`,children:[z===`alerts`&&(0,T.jsxDEV)(T.Fragment,{children:[(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3`,children:[(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-3`,children:[(0,T.jsxDEV)(`div`,{className:`min-w-0`,children:[(0,T.jsxDEV)(`div`,{className:`text-sm font-semibold text-white`,children:`Announce Incoming Calls & Messages Aloud`},void 0,!1,{fileName:E,lineNumber:245,columnNumber:21},void 0),(0,T.jsxDEV)(`div`,{className:`text-xs text-slate-400`,children:`Requires your explicit consent. Turn off anytime for silence.`},void 0,!1,{fileName:E,lineNumber:248,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:244,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock();let e=!k.enabled;e&&typeof Notification<`u`&&Notification.permission==="default"&&Notification.requestPermission().catch(()=>{}),A({enabled:e})},className:`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${k.enabled?`bg-emerald-600 text-white`:`bg-slate-800 text-slate-300 hover:bg-slate-700`}`,children:k.enabled?`Enabled`:`Disabled`},void 0,!1,{fileName:E,lineNumber:252,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:243,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>A({announceCalls:!k.announceCalls}),className:`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${k.announceCalls?`bg-slate-800/90 border-emerald-400/50 text-emerald-200`:`bg-slate-950 border-white/10 text-slate-400`}`,children:[(0,T.jsxDEV)(`span`,{children:`Incoming Call Caller ID`},void 0,!1,{fileName:E,lineNumber:284,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{className:`font-bold`,children:k.announceCalls?`ON`:`OFF`},void 0,!1,{fileName:E,lineNumber:285,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:273,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>A({announceMessages:!k.announceMessages}),className:`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${k.announceMessages?`bg-slate-800/90 border-emerald-400/50 text-emerald-200`:`bg-slate-950 border-white/10 text-slate-400`}`,children:[(0,T.jsxDEV)(`span`,{children:`WhatsApp / SMS Sender`},void 0,!1,{fileName:E,lineNumber:299,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{className:`font-bold`,children:k.announceMessages?`ON`:`OFF`},void 0,!1,{fileName:E,lineNumber:300,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:288,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>A({readMessageContent:!k.readMessageContent}),className:`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${k.readMessageContent?`bg-amber-950/70 border-amber-400/60 text-amber-200`:`bg-slate-950 border-white/10 text-slate-300`}`,children:[(0,T.jsxDEV)(`span`,{children:`Read Message Body Aloud`},void 0,!1,{fileName:E,lineNumber:314,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{className:`font-bold`,children:k.readMessageContent?`ON`:`Private`},void 0,!1,{fileName:E,lineNumber:315,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:303,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>A({maskSensitiveCodes:!k.maskSensitiveCodes}),className:`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${k.maskSensitiveCodes?`bg-slate-800/90 border-cyan-400/50 text-cyan-200`:`bg-slate-950 border-white/10 text-slate-400`}`,children:[(0,T.jsxDEV)(`span`,{children:`Hide OTP & Bank Codes`},void 0,!1,{fileName:E,lineNumber:331,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{className:`font-bold`,children:k.maskSensitiveCodes?`Protected`:`OFF`},void 0,!1,{fileName:E,lineNumber:332,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:320,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:272,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`flex flex-wrap items-center gap-2 pt-2 border-t border-white/10`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock(),P()},className:`min-h-[40px] px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(i,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:347,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Repeat Last Notification`},void 0,!1,{fileName:E,lineNumber:348,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:339,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:se,disabled:Y,className:`min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(f,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:357,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:Y?`Summarizing...`:`30s WhatsApp Group Digest`},void 0,!1,{fileName:E,lineNumber:358,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:351,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{let e=_(`notification_listener`);J(e)},className:`min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(u,{className:`w-3.5 h-3.5 text-amber-300 shrink-0`},void 0,!1,{fileName:E,lineNumber:369,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Android Notification Access`},void 0,!1,{fileName:E,lineNumber:370,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:361,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:338,columnNumber:17},void 0),Z&&(0,T.jsxDEV)(`div`,{className:`mt-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-2`,children:[(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-2`,children:[(0,T.jsxDEV)(`span`,{className:`text-[11px] font-bold text-emerald-200`,children:[`30s Briefing (`,Z.totalCount,` alerts · `,Z.groupCount,` groups)`]},void 0,!0,{fileName:E,lineNumber:377,columnNumber:23},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock(),t.speakText(Z.digestText,{language:D===`auto`?`urdu`:D,voiceName:O})},className:`px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer`,children:[(0,T.jsxDEV)(d,{className:`w-3 h-3`},void 0,!1,{fileName:E,lineNumber:391,columnNumber:25},void 0),(0,T.jsxDEV)(`span`,{children:`Read Digest Aloud`},void 0,!1,{fileName:E,lineNumber:392,columnNumber:25},void 0)]},void 0,!0,{fileName:E,lineNumber:380,columnNumber:23},void 0)]},void 0,!0,{fileName:E,lineNumber:376,columnNumber:21},void 0),(0,T.jsxDEV)(`p`,{className:`text-xs text-slate-100 leading-relaxed`,children:Z.digestText},void 0,!1,{fileName:E,lineNumber:395,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:375,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:242,columnNumber:15},void 0),(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2.5`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-slate-200`,children:`Test Spoken Call, Message & Private OTP Protection`},void 0,!1,{fileName:E,lineNumber:404,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`grid grid-cols-3 gap-2`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock(),M({type:`incoming_call`,appName:`Phone Call`,sender:`Ali Khan`,body:`Incoming mobile voice call`})},className:`min-h-[40px] px-2.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(c,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:421,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Test Call`},void 0,!1,{fileName:E,lineNumber:422,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:408,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock(),M({type:`message`,appName:`WhatsApp`,sender:`Ahmed`,body:`اسلام علیکم بھائی، میں شام 7 بجے ملاقات کے لیے آ رہا ہوں۔`})},className:`min-h-[40px] px-2.5 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(f,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:438,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Test Msg`},void 0,!1,{fileName:E,lineNumber:439,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:425,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock(),M({type:`message`,appName:`SMS`,sender:`Bank Alert`,body:`Your private bank verification OTP code is 482910. Do not share.`})},className:`min-h-[40px] px-2.5 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(s,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:455,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Test OTP`},void 0,!1,{fileName:E,lineNumber:456,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:442,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:407,columnNumber:17},void 0),(0,T.jsxDEV)(`p`,{className:`text-[11px] text-slate-400 leading-relaxed`,children:[`Voice command supported anytime: say `,(0,T.jsxDEV)(`strong`,{children:`“Zara repeat last notification”`},void 0,!1,{fileName:E,lineNumber:460,columnNumber:56},void 0),` or `,(0,T.jsxDEV)(`strong`,{children:`“آخری نوٹیفکیشن سناؤ”`},void 0,!1,{fileName:E,lineNumber:460,columnNumber:120},void 0),`.`]},void 0,!0,{fileName:E,lineNumber:459,columnNumber:17},void 0)]},void 0,!0,{fileName:E,lineNumber:403,columnNumber:15},void 0),(0,T.jsxDEV)(`div`,{className:`space-y-2`,children:[(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,T.jsxDEV)(`span`,{className:`text-xs font-semibold text-slate-300`,children:[`Recent Notifications (`,j.length,`)`]},void 0,!0,{fileName:E,lineNumber:467,columnNumber:19},void 0),j.length>0&&(0,T.jsxDEV)(`button`,{type:`button`,onClick:N,className:`text-xs text-rose-300 hover:text-rose-200 cursor-pointer`,children:`Clear All`},void 0,!1,{fileName:E,lineNumber:471,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:466,columnNumber:17},void 0),j.map(e=>{let n=k.maskSensitiveCodes?re(e.body):{maskedText:e.body,wasMasked:!1},r=!k.readMessageContent&&e.type===`message`?`Message content hidden (enable "Read Message Body Aloud" above to view/hear).`:n.maskedText;return(0,T.jsxDEV)(`div`,{className:`p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1.5`,children:[(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-2 text-xs`,children:[(0,T.jsxDEV)(`span`,{className:`font-semibold text-white truncate`,children:[e.appName,e.conversationTitle?` [${e.conversationTitle}]`:``,` · `,e.sender,(e.isGroup||e.conversationTitle)&&(0,T.jsxDEV)(`span`,{className:`ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase`,children:`Group`},void 0,!1,{fileName:E,lineNumber:499,columnNumber:29},void 0)]},void 0,!0,{fileName:E,lineNumber:495,columnNumber:25},void 0),(0,T.jsxDEV)(`span`,{className:`text-[11px] text-slate-400 font-mono tabular-nums shrink-0`,children:e.timestamp},void 0,!1,{fileName:E,lineNumber:504,columnNumber:25},void 0)]},void 0,!0,{fileName:E,lineNumber:494,columnNumber:23},void 0),(0,T.jsxDEV)(`p`,{className:`text-xs text-slate-300 leading-relaxed`,children:r},void 0,!1,{fileName:E,lineNumber:508,columnNumber:23},void 0),(0,T.jsxDEV)(`div`,{className:`flex items-center gap-2 pt-1`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>{t.unlock();let n=C(e,k);t.speakText(n,{language:D===`auto`?`urdu`:D,voiceName:O})},className:`min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-pink-200 flex items-center gap-1 cursor-pointer`,children:[(0,T.jsxDEV)(d,{className:`w-3.5 h-3.5`},void 0,!1,{fileName:E,lineNumber:522,columnNumber:27},void 0),(0,T.jsxDEV)(`span`,{children:`Read Aloud`},void 0,!1,{fileName:E,lineNumber:523,columnNumber:27},void 0)]},void 0,!0,{fileName:E,lineNumber:510,columnNumber:25},void 0),!n.wasMasked&&k.readMessageContent&&(0,T.jsxDEV)(`button`,{type:`button`,onClick:async()=>{await g(`${e.sender}: ${e.body}`)&&(W(e.id),window.setTimeout(()=>W(null),2e3))},className:`min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1 cursor-pointer`,children:U===e.id?(0,T.jsxDEV)(T.Fragment,{children:[(0,T.jsxDEV)(p,{className:`w-3 h-3 text-emerald-400`},void 0,!1,{fileName:E,lineNumber:540,columnNumber:33},void 0),(0,T.jsxDEV)(`span`,{children:`Copied!`},void 0,!1,{fileName:E,lineNumber:541,columnNumber:33},void 0)]},void 0,!0,{fileName:E,lineNumber:539,columnNumber:31},void 0):(0,T.jsxDEV)(T.Fragment,{children:[(0,T.jsxDEV)(l,{className:`w-3 h-3`},void 0,!1,{fileName:E,lineNumber:545,columnNumber:33},void 0),(0,T.jsxDEV)(`span`,{children:`Copy`},void 0,!1,{fileName:E,lineNumber:546,columnNumber:33},void 0)]},void 0,!0,{fileName:E,lineNumber:544,columnNumber:31},void 0)},void 0,!1,{fileName:E,lineNumber:527,columnNumber:27},void 0)]},void 0,!0,{fileName:E,lineNumber:509,columnNumber:23},void 0)]},e.id,!0,{fileName:E,lineNumber:490,columnNumber:21},void 0)})]},void 0,!0,{fileName:E,lineNumber:465,columnNumber:15},void 0)]},void 0,!0,{fileName:E,lineNumber:241,columnNumber:13},void 0),z===`avatar`&&(0,T.jsxDEV)(`div`,{className:`space-y-3`,children:[(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3`,children:[(0,T.jsxDEV)(`div`,{className:`min-w-0`,children:[(0,T.jsxDEV)(`div`,{className:`text-sm font-semibold text-white`,children:`Upload Custom Background Image`},void 0,!1,{fileName:E,lineNumber:564,columnNumber:19},void 0),(0,T.jsxDEV)(`div`,{className:`text-xs text-slate-400`,children:`Choose any photo from your phone gallery or pick a 3D-style HD avatar below.`},void 0,!1,{fileName:E,lineNumber:567,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:563,columnNumber:17},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>Q.current?.click(),className:`min-h-[42px] px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer`,children:[(0,T.jsxDEV)(o,{className:`w-4 h-4 shrink-0`},void 0,!1,{fileName:E,lineNumber:576,columnNumber:19},void 0),(0,T.jsxDEV)(`span`,{children:`Upload Image`},void 0,!1,{fileName:E,lineNumber:577,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:571,columnNumber:17},void 0)]},void 0,!0,{fileName:E,lineNumber:562,columnNumber:15},void 0),(0,T.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-3 gap-2.5`,children:V.map(e=>{let n=(L||V[0]?.id)===e.id;return(0,T.jsxDEV)(`div`,{onClick:()=>{t.playChime(`tap`),R(e.id),J(`Applied full-screen background: ${e.name}`)},className:`relative group rounded-2xl overflow-hidden border cursor-pointer transition-transform active:scale-[0.98] ${n?`border-pink-400 ring-2 ring-pink-500/50`:`border-white/15 hover:border-white/35`}`,children:(0,T.jsxDEV)(`div`,{className:`aspect-[3/4] w-full bg-slate-900 relative`,children:[(0,T.jsxDEV)(`img`,{src:e.src,alt:e.name,referrerPolicy:`no-referrer`,style:e.colorFilter?{filter:e.colorFilter}:void 0,className:`w-full h-full object-cover`},void 0,!1,{fileName:E,lineNumber:600,columnNumber:25},void 0),(0,T.jsxDEV)(`div`,{className:`absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-white truncate`,children:e.name},void 0,!1,{fileName:E,lineNumber:608,columnNumber:27},void 0),(0,T.jsxDEV)(`div`,{className:`text-[10px] text-slate-300 truncate`,children:e.isCustom?`Custom Background`:`Blink & Lip-Sync HD`},void 0,!1,{fileName:E,lineNumber:611,columnNumber:27},void 0)]},void 0,!0,{fileName:E,lineNumber:607,columnNumber:25},void 0),n&&(0,T.jsxDEV)(`div`,{className:`absolute top-2 left-2 px-2 py-0.5 rounded-md bg-pink-600 text-white text-[10px] font-bold`,children:`Active`},void 0,!1,{fileName:E,lineNumber:617,columnNumber:27},void 0),e.isCustom&&(0,T.jsxDEV)(`button`,{type:`button`,onClick:t=>{t.stopPropagation(),S(e.id);let r=x();H(r),n&&r[0]&&R(r[0].id)},className:`absolute top-2 right-2 min-h-[30px] min-w-[30px] rounded-lg bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer`,title:`Delete custom background`,children:(0,T.jsxDEV)(te,{className:`w-3.5 h-3.5`},void 0,!1,{fileName:E,lineNumber:637,columnNumber:29},void 0)},void 0,!1,{fileName:E,lineNumber:623,columnNumber:27},void 0)]},void 0,!0,{fileName:E,lineNumber:599,columnNumber:23},void 0)},e.id,!1,{fileName:E,lineNumber:586,columnNumber:21},void 0)})},void 0,!1,{fileName:E,lineNumber:581,columnNumber:15},void 0)]},void 0,!0,{fileName:E,lineNumber:561,columnNumber:13},void 0),z===`android`&&(0,T.jsxDEV)(`div`,{className:`space-y-3`,children:[(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5`,children:[(0,T.jsxDEV)(`div`,{className:`text-sm font-semibold text-white flex items-center gap-2`,children:[(0,T.jsxDEV)(n,{className:`w-4 h-4 text-emerald-400 shrink-0`},void 0,!1,{fileName:E,lineNumber:654,columnNumber:19},void 0),(0,T.jsxDEV)(`span`,{children:`Privacy & Background Listening Controls`},void 0,!1,{fileName:E,lineNumber:655,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:653,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-3 pt-1`,children:[(0,T.jsxDEV)(`div`,{className:`min-w-0`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-slate-100`,children:`Background & Lock-Screen Voice Listening`},void 0,!1,{fileName:E,lineNumber:660,columnNumber:21},void 0),(0,T.jsxDEV)(`div`,{className:`text-[11px] text-slate-400`,children:`Persistent notification & MediaSession mic stream`},void 0,!1,{fileName:E,lineNumber:663,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:659,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:I,className:`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${F?`bg-emerald-600 text-white`:`bg-slate-800 text-slate-300`}`,children:F?`Active (Disable)`:`Disabled (Enable)`},void 0,!1,{fileName:E,lineNumber:667,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:658,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`flex items-center justify-between gap-3 pt-2 border-t border-white/10`,children:[(0,T.jsxDEV)(`div`,{className:`min-w-0`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-slate-100`,children:`Spoken Call & Message Notification Reader`},void 0,!1,{fileName:E,lineNumber:682,columnNumber:21},void 0),(0,T.jsxDEV)(`div`,{className:`text-[11px] text-slate-400`,children:`Reads incoming alerts only when you enable this switch`},void 0,!1,{fileName:E,lineNumber:685,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:681,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>A({enabled:!k.enabled}),className:`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${k.enabled?`bg-emerald-600 text-white`:`bg-slate-800 text-slate-300`}`,children:k.enabled?`Active (Disable)`:`Disabled (Enable)`},void 0,!1,{fileName:E,lineNumber:689,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:680,columnNumber:17},void 0)]},void 0,!0,{fileName:E,lineNumber:652,columnNumber:15},void 0),(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-white flex items-center gap-1.5`,children:[(0,T.jsxDEV)(a,{className:`w-4 h-4 text-sky-400 shrink-0`},void 0,!1,{fileName:E,lineNumber:706,columnNumber:19},void 0),(0,T.jsxDEV)(`span`,{children:`How to Enable Required Android Permissions`},void 0,!1,{fileName:E,lineNumber:707,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:705,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`grid grid-cols-1 sm:grid-cols-2 gap-2`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>J(_(`app_permissions`)),className:`min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer`,children:[(0,T.jsxDEV)(ee,{className:`w-3.5 h-3.5 text-emerald-400 shrink-0`},void 0,!1,{fileName:E,lineNumber:718,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`1. Mic, Camera & Notifications`},void 0,!1,{fileName:E,lineNumber:719,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:711,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>J(_(`battery_unrestricted`)),className:`min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer`,children:[(0,T.jsxDEV)(a,{className:`w-3.5 h-3.5 text-amber-300 shrink-0`},void 0,!1,{fileName:E,lineNumber:729,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`2. Unrestricted Battery (Lock-Screen)`},void 0,!1,{fileName:E,lineNumber:730,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:722,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>J(_(`notification_listener`)),className:`min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer`,children:[(0,T.jsxDEV)(u,{className:`w-3.5 h-3.5 text-pink-300 shrink-0`},void 0,!1,{fileName:E,lineNumber:740,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`3. Notification Access (Call/Msg)`},void 0,!1,{fileName:E,lineNumber:741,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:733,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:()=>J(_(`accessibility`)),className:`min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer`,children:[(0,T.jsxDEV)(n,{className:`w-3.5 h-3.5 text-cyan-300 shrink-0`},void 0,!1,{fileName:E,lineNumber:751,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`4. Accessibility Service`},void 0,!1,{fileName:E,lineNumber:752,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:744,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:710,columnNumber:17},void 0),(0,T.jsxDEV)(`ul`,{className:`text-[11px] text-slate-300 space-y-1 leading-relaxed pt-1`,children:[(0,T.jsxDEV)(`li`,{children:[`• `,(0,T.jsxDEV)(`strong`,{children:`Microphone & Camera`},void 0,!1,{fileName:E,lineNumber:758,columnNumber:23},void 0),`: Tap Allow when prompted in Chrome/Zara. Camera never activates unless you tap Front Cam / Back Cam or ask Zara to open it.`]},void 0,!0,{fileName:E,lineNumber:757,columnNumber:19},void 0),(0,T.jsxDEV)(`li`,{children:[`• `,(0,T.jsxDEV)(`strong`,{children:`Lock-Screen Voice`},void 0,!1,{fileName:E,lineNumber:761,columnNumber:23},void 0),`: Install Zara to Home Screen and set Battery usage for Chrome/Zara to `,(0,T.jsxDEV)(`em`,{children:`Unrestricted`},void 0,!1,{fileName:E,lineNumber:761,columnNumber:128},void 0),`. Note: Android 12+ may pause browser mics after prolonged deep sleep unless the Native Kotlin Foreground Service is installed.`]},void 0,!0,{fileName:E,lineNumber:760,columnNumber:19},void 0),(0,T.jsxDEV)(`li`,{children:[`• `,(0,T.jsxDEV)(`strong`,{children:`Incoming Call/SMS Reading & Auto-Send`},void 0,!1,{fileName:E,lineNumber:764,columnNumber:23},void 0),`: Android sandboxes web apps from reading other apps' notifications or pressing Send inside WhatsApp automatically. In Web/PWA mode, Zara prepares the call/message with recipient confirmation and opens the dialer/messaging app; full silent reading & ForegroundService use the Native Kotlin Companion below (`,$?`Connected`:`Web/PWA Mode`,`).`]},void 0,!0,{fileName:E,lineNumber:763,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:756,columnNumber:17},void 0)]},void 0,!0,{fileName:E,lineNumber:704,columnNumber:15},void 0),(0,T.jsxDEV)(`div`,{className:`p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/35 space-y-2.5`,children:[(0,T.jsxDEV)(`div`,{className:`text-xs font-semibold text-cyan-200`,children:`Native Android Kotlin Companion (ForegroundService + NotificationListener)`},void 0,!1,{fileName:E,lineNumber:771,columnNumber:17},void 0),(0,T.jsxDEV)(`p`,{className:`text-[11px] text-slate-300 leading-relaxed`,children:[`Includes complete `,(0,T.jsxDEV)(`code`,{className:`text-cyan-300`,children:`AndroidManifest.xml`},void 0,!1,{fileName:E,lineNumber:775,columnNumber:37},void 0),`,`,` `,(0,T.jsxDEV)(`code`,{className:`text-cyan-300`,children:`ZaraVoiceForegroundService.kt`},void 0,!1,{fileName:E,lineNumber:776,columnNumber:19},void 0),`, and`,` `,(0,T.jsxDEV)(`code`,{className:`text-cyan-300`,children:`ZaraNotificationListenerService.kt`},void 0,!1,{fileName:E,lineNumber:777,columnNumber:19},void 0),` wired to`,` `,(0,T.jsxDEV)(`code`,{className:`text-cyan-300`,children:`window.ZaraAndroidBridge`},void 0,!1,{fileName:E,lineNumber:778,columnNumber:19},void 0),`.`]},void 0,!0,{fileName:E,lineNumber:774,columnNumber:17},void 0),(0,T.jsxDEV)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,T.jsxDEV)(`button`,{type:`button`,onClick:le,className:`min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer`,children:[(0,T.jsxDEV)(r,{className:`w-3.5 h-3.5 shrink-0`},void 0,!1,{fileName:E,lineNumber:786,columnNumber:21},void 0),(0,T.jsxDEV)(`span`,{children:`Download Kotlin Module`},void 0,!1,{fileName:E,lineNumber:787,columnNumber:21},void 0)]},void 0,!0,{fileName:E,lineNumber:781,columnNumber:19},void 0),(0,T.jsxDEV)(`button`,{type:`button`,onClick:async()=>{await g(`================================================================================
ZARA NATIVE ANDROID COMPANION MODULE (KOTLIN — ANDROID 10 TO ANDROID 15)
================================================================================
Why this companion module exists:
- Web / Installed PWA (WebAPK) directly supports:
  * AI chat & neural TTS in Urdu, Hindi, Punjabi, and English
  * Full-screen HD female avatar with blinking, expressions, lip-sync & custom bg
  * Front/Back camera & screen vision with explicit user permission + active badge
  * Copy selected or full chat message / AI reply with clipboard confirmation
  * Opening installed Android apps & dialing/preparing WhatsApp/SMS/Telegram via
    Android intents AFTER mandatory recipient confirmation.
- Android OS sandboxes browsers/PWAs from 3 OS-restricted capabilities unless
  wrapped in this Native Android Companion APK:
  (1) Reading other apps' incoming call / WhatsApp / SMS notifications
      -> requires Android NotificationListenerService + user toggle in Settings.
  (2) Indefinite lock-screen microphone capture when screen is off for hours
      -> requires Android foregroundServiceType="microphone" + Unrestricted Battery.
  (3) Automatic final "Send" tap inside WhatsApp/WhatsApp Business without manual tap
      -> requires user-enabled AccessibilityService AFTER Zara UI confirmation.

--------------------------------------------------------------------------------
1. AndroidManifest.xml (Least-Privilege Permissions & Services)
--------------------------------------------------------------------------------
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.zara.assistant">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <!-- Only invoked AFTER explicit user confirmation in Zara UI -->
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />

    <application
        android:label="Zara AI Assistant"
        android:usesCleartextTraffic="false"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".ZaraVoiceForegroundService"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <service
            android:name=".ZaraNotificationListenerService"
            android:label="Zara Spoken Notifications"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <service
            android:name=".ZaraAccessibilityService"
            android:label="Zara App Control Helper"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/zara_accessibility_config" />
        </service>
    </application>
</manifest>

--------------------------------------------------------------------------------
2. MainActivity.kt (WebView + @JavascriptInterface ZaraAndroidBridge)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.telephony.SmsManager
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val WEB_APP_URL = "https://YOUR-DEPLOYED-ZARA-URL.run.app"

    private val notifReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != "com.zara.NOTIFICATION_EVENT") return
            val payload = JSONObject().apply {
                put("type", intent.getStringExtra("type") ?: "message")
                put("appName", intent.getStringExtra("appName") ?: "Android")
                put("sender", intent.getStringExtra("sender") ?: "")
                put("body", intent.getStringExtra("body") ?: "")
            }
            webView.post {
                webView.evaluateJavascript(
                    "window.onZaraIncomingNotification && window.onZaraIncomingNotification(" + payload.toString() + ");",
                    null
                )
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }
        webView.addJavascriptInterface(ZaraBridge(), "ZaraAndroidBridge")
        webView.loadUrl(WEB_APP_URL)

        ContextCompat.registerReceiver(
            this, notifReceiver, IntentFilter("com.zara.NOTIFICATION_EVENT"),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    inner class ZaraBridge {
        @JavascriptInterface
        fun setForegroundVoiceListening(enabled: Boolean): Boolean {
            val svc = Intent(this@MainActivity, ZaraVoiceForegroundService::class.java)
            if (enabled) ContextCompat.startForegroundService(this@MainActivity, svc)
            else stopService(svc)
            return true
        }

        @JavascriptInterface
        fun placeConfirmedPhoneCall(phone: String): Boolean {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED) return false
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:" + phone)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(callIntent)
            return true
        }

        @JavascriptInterface
        fun sendConfirmedSms(phone: String, body: String): Boolean {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) return false
            val sms = getSystemService(SmsManager::class.java)
            sms.sendTextMessage(phone, null, body, null, null)
            return true
        }

        @JavascriptInterface
        fun launchPackage(pkg: String): Boolean {
            val launch = packageManager.getLaunchIntentForPackage(pkg) ?: return false
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(launch)
            return true
        }

        @JavascriptInterface
        fun openNotificationAccessSettings() {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }

    override fun onDestroy() {
        unregisterReceiver(notifReceiver)
        super.onDestroy()
    }
}

--------------------------------------------------------------------------------
3. ZaraVoiceForegroundService.kt (Lock-Screen Persistent Notification & WakeLock)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.*
import androidx.core.app.NotificationCompat

class ZaraVoiceForegroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        val channelId = "zara_voice_fg"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Zara Background Voice Service",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Zara Voice Assistant Active")
            .setContentText("Listening on lock screen when permitted. Tap to open or disable.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(1001, notification)
        }

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zara::VoiceLock").apply {
            acquire(6 * 60 * 60 * 1000L)
        }
    }

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

--------------------------------------------------------------------------------
4. ZaraNotificationListenerService.kt (Forwards Call & Message Alerts to WebView)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class ZaraNotificationListenerService : NotificationListenerService() {
    private val allowedPackages = setOf(
        "com.whatsapp", "com.whatsapp.w4b", "com.google.android.apps.messaging",
        "com.samsung.android.messaging", "org.telegram.messenger",
        "com.facebook.orca", "com.google.android.dialer", "com.samsung.android.incallui"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        if (!allowedPackages.contains(pkg)) return
        val extras = sbn.notification.extras ?: return
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val isCall = sbn.notification.category == Notification.CATEGORY_CALL

        val broadcast = Intent("com.zara.NOTIFICATION_EVENT").apply {
            setPackage(packageName)
            putExtra("type", if (isCall) "incoming_call" else "message")
            putExtra("appName", pkg)
            putExtra("sender", sender)
            putExtra("body", text)
        }
        sendBroadcast(broadcast)
    }
}

--------------------------------------------------------------------------------
5. ZaraAccessibilityService.kt (User-Authorized Send Button Helper)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ZaraAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile var pendingConfirmedSendForPkg: String? = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val targetPkg = pendingConfirmedSendForPkg ?: return
        if (event?.packageName?.toString() != targetPkg) return
        val root = rootInActiveWindow ?: return
        val sendNodes = root.findAccessibilityNodeInfosByViewId(targetPkg + ":id/send")
        if (!sendNodes.isNullOrEmpty()) {
            pendingConfirmedSendForPkg = null
            sendNodes[0].performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
    }

    override fun onInterrupt() {}
}
`)&&(K(!0),window.setTimeout(()=>K(!1),2200))},className:`min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer`,children:G?(0,T.jsxDEV)(T.Fragment,{children:[(0,T.jsxDEV)(p,{className:`w-3.5 h-3.5 text-emerald-400`},void 0,!1,{fileName:E,lineNumber:803,columnNumber:25},void 0),(0,T.jsxDEV)(`span`,{children:`Copied Kotlin Code!`},void 0,!1,{fileName:E,lineNumber:804,columnNumber:25},void 0)]},void 0,!0,{fileName:E,lineNumber:802,columnNumber:23},void 0):(0,T.jsxDEV)(T.Fragment,{children:[(0,T.jsxDEV)(l,{className:`w-3.5 h-3.5`},void 0,!1,{fileName:E,lineNumber:808,columnNumber:25},void 0),(0,T.jsxDEV)(`span`,{children:`Copy Kotlin Code`},void 0,!1,{fileName:E,lineNumber:809,columnNumber:25},void 0)]},void 0,!0,{fileName:E,lineNumber:807,columnNumber:23},void 0)},void 0,!1,{fileName:E,lineNumber:790,columnNumber:19},void 0)]},void 0,!0,{fileName:E,lineNumber:780,columnNumber:17},void 0)]},void 0,!0,{fileName:E,lineNumber:770,columnNumber:15},void 0)]},void 0,!0,{fileName:E,lineNumber:650,columnNumber:13},void 0)]},void 0,!0,{fileName:E,lineNumber:238,columnNumber:9},void 0)]},void 0,!0,{fileName:E,lineNumber:173,columnNumber:7},void 0)]},void 0,!0,{fileName:E,lineNumber:164,columnNumber:5},void 0)};export{D as NotificationsModal};
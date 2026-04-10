import{s as e}from"./iframe-IWrIH74E.js";import{t}from"./jsx-runtime-BYorA0Vo.js";import{t as n}from"./react-CncqkajK.js";import{t as r}from"./createLucideIcon-zEJwlZt4.js";import{n as i,t as a}from"./message-circle-BOPF2xSd.js";var o=r(`gift`,[[`rect`,{x:`3`,y:`8`,width:`18`,height:`4`,rx:`1`,key:`bkv52`}],[`path`,{d:`M12 8v13`,key:`1c76mn`}],[`path`,{d:`M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7`,key:`6wjy6b`}],[`path`,{d:`M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5`,key:`1ihvrl`}]]),s=r(`store`,[[`path`,{d:`M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5`,key:`slp6dd`}],[`path`,{d:`M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244`,key:`o0xfot`}],[`path`,{d:`M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05`,key:`wn3emo`}]]),c=r(`user`,[[`path`,{d:`M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2`,key:`975kel`}],[`circle`,{cx:`12`,cy:`7`,r:`4`,key:`17ys0d`}]]),l=t(),u=({name:e,setActiveTab:t,activeTab:n,messagingEnabled:r=!0,storeEnabled:u=!1,giveawayEnabled:d=!1,gatheringsEnabled:f=!1,isSupporter:p=!1})=>(0,l.jsx)(`div`,{className:`sticky top-4 mt-5 z-50 bg-[#FBFBFC]/80 backdrop-blur-md border-b border-slate-100 mb-8`,children:(0,l.jsx)(`div`,{className:`max-w-2xl mx-auto flex items-center justify-between px-2 w-full`,children:[{id:`community`,label:`Community`,icon:(0,l.jsx)(c,{size:16})},...u?[{id:`store`,label:`Store`,icon:(0,l.jsx)(s,{size:16})}]:[],...d?[{id:`giveaways`,label:`Giveaways`,icon:(0,l.jsx)(o,{size:16})}]:[],...f?[{id:`gatherings`,label:`Events`,icon:(0,l.jsx)(i,{size:16})}]:[],...r?[{id:`message`,label:`Message ${e.split(` `)[0]}`,icon:(0,l.jsx)(a,{size:16})}]:[]].map(e=>(0,l.jsxs)(`button`,{onClick:()=>t(e.id),className:`flex flex-col items-center gap-1 px-4 py-4 border-b-2 transition-all duration-300 ${n===e.id?`border-orange-600 text-orange-600 font-bold`:`border-transparent text-slate-400 hover:text-slate-600`}`,children:[e.icon,(0,l.jsx)(`span`,{className:`text-[10px] uppercase tracking-widest`,children:e.label})]},e.id))})});u.__docgenInfo={description:``,methods:[],displayName:`TabManager`,props:{name:{required:!0,tsType:{name:`string`},description:``},setActiveTab:{required:!0,tsType:{name:`any`},description:``},activeTab:{required:!0,tsType:{name:`string`},description:``},messagingEnabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`true`,computed:!1}},storeEnabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},giveawayEnabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},gatheringsEnabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},isSupporter:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}};var d=e(n()),f={title:`Components/TabManager`,component:u,tags:[`autodocs`]},p={args:{name:`John Doe`,setActiveTab:()=>{},activeTab:`community`}},m={args:{name:`John Doe`,setActiveTab:()=>{},activeTab:`community`,storeEnabled:!0}},h={args:{name:`John Doe`,setActiveTab:()=>{},activeTab:`community`,messagingEnabled:!0,storeEnabled:!0,giveawayEnabled:!0,gatheringsEnabled:!0}},g={render:()=>{let[e,t]=(0,d.useState)(`community`);return(0,l.jsx)(u,{name:`John Doe`,setActiveTab:t,activeTab:e,messagingEnabled:!0,storeEnabled:!0,giveawayEnabled:!0,gatheringsEnabled:!0})}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community',
    storeEnabled: true
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community',
    messagingEnabled: true,
    storeEnabled: true,
    giveawayEnabled: true,
    gatheringsEnabled: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [activeTab, setActiveTab] = useState('community');
    return <TabManager name="John Doe" setActiveTab={setActiveTab} activeTab={activeTab} messagingEnabled storeEnabled giveawayEnabled gatheringsEnabled />;
  }
}`,...g.parameters?.docs?.source}}};var _=[`Default`,`WithStore`,`WithAllFeatures`,`Interactive`];export{p as Default,g as Interactive,h as WithAllFeatures,m as WithStore,_ as __namedExportsOrder,f as default};
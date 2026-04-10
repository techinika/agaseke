import{s as e}from"./iframe-IWrIH74E.js";import{t}from"./jsx-runtime-BYorA0Vo.js";import{t as n}from"./react-CncqkajK.js";import{t as r}from"./heart-DDh5NsqG.js";import{t as i}from"./lock-hjEyU0wW.js";import{t as a}from"./link-CvMZY5kO.js";var o=e(a()),s=t(),c=({isLoggedIn:e,hasGifted:t,type:n,setIsModalOpen:a,handle:c})=>e?n===`gift`&&!t?(0,s.jsxs)(`div`,{className:`flex flex-col items-center justify-center py-20 text-center animate-in fade-in`,children:[(0,s.jsx)(r,{className:`text-orange-200 mb-4`,size:48}),(0,s.jsx)(`h3`,{className:`text-xl font-bold`,children:`Send a Gift to Unlock`}),(0,s.jsx)(`p`,{className:`text-slate-500 max-w-xs mx-auto mb-6`,children:`Direct messaging is exclusive to supporters. Send a small gift to start the conversation.`}),(0,s.jsx)(`button`,{onClick:()=>a(!0),className:`bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all`,children:`Send a Gift`})]}):null:(0,s.jsxs)(`div`,{className:`flex flex-col items-center justify-center py-20 text-center animate-in fade-in`,children:[(0,s.jsx)(i,{className:`text-slate-300 mb-4`,size:48}),(0,s.jsx)(`h3`,{className:`text-xl font-bold`,children:`Authentication Required`}),(0,s.jsx)(`p`,{className:`text-slate-500 max-w-xs mx-auto mb-6`,children:`Please log in to access this feature and connect with the creator.`}),(0,s.jsx)(o.default,{href:`/login?referral=${c}`,className:`bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all`,children:`Log In to Agaseke`})]});c.__docgenInfo={description:``,methods:[],displayName:`ProtectedSection`,props:{isLoggedIn:{required:!0,tsType:{name:`boolean`},description:``},hasGifted:{required:!0,tsType:{name:`boolean`},description:``},type:{required:!0,tsType:{name:`union`,raw:`"login" | "gift"`,elements:[{name:`literal`,value:`"login"`},{name:`literal`,value:`"gift"`}]},description:``},setIsModalOpen:{required:!0,tsType:{name:`any`},description:``},handle:{required:!1,tsType:{name:`string`},description:``}}};var l=e(n()),u={title:`Components/ProtectedSection`,component:c,tags:[`autodocs`]},d={args:{isLoggedIn:!1,hasGifted:!1,type:`login`,setIsModalOpen:()=>{}}},f={args:{isLoggedIn:!0,hasGifted:!1,type:`gift`,setIsModalOpen:()=>console.log(`Open modal`)}},p={args:{isLoggedIn:!0,hasGifted:!0,type:`gift`,setIsModalOpen:()=>{}}},m={render:()=>{let[e,t]=(0,l.useState)(!1);return(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`button`,{onClick:()=>t(!0),children:`Open Gift Modal`}),(0,s.jsx)(c,{isLoggedIn:!0,hasGifted:!1,type:`gift`,setIsModalOpen:t})]})}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    isLoggedIn: false,
    hasGifted: false,
    type: 'login',
    setIsModalOpen: () => {}
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    isLoggedIn: true,
    hasGifted: false,
    type: 'gift',
    setIsModalOpen: () => console.log('Open modal')
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    isLoggedIn: true,
    hasGifted: true,
    type: 'gift',
    setIsModalOpen: () => {}
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    return <div>\r
        <button onClick={() => setIsModalOpen(true)}>Open Gift Modal</button>\r
        <ProtectedSection isLoggedIn={true} hasGifted={false} type="gift" setIsModalOpen={setIsModalOpen} />\r
      </div>;
  }
}`,...m.parameters?.docs?.source}}};var h=[`LoginRequired`,`GiftRequired`,`Unlocked`,`Interactive`];export{f as GiftRequired,m as Interactive,d as LoginRequired,p as Unlocked,h as __namedExportsOrder,u as default};
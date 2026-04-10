import{t as e}from"./jsx-runtime-BYorA0Vo.js";import{t}from"./createLucideIcon-zEJwlZt4.js";import{t as n}from"./loader-DQ7cdaMi.js";import{t as r}from"./x-BDyxfYkK.js";var i=t(`triangle-alert`,[[`path`,{d:`m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3`,key:`wmoenq`}],[`path`,{d:`M12 9v4`,key:`juzpu7`}],[`path`,{d:`M12 17h.01`,key:`p32p05`}]]),a=e();function o({isOpen:e,onClose:t,onConfirm:o,title:s,message:c,confirmText:l=`Confirm`,cancelText:u=`Cancel`,loading:d=!1,variant:f=`danger`}){return e?(0,a.jsx)(`div`,{className:`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4`,children:(0,a.jsx)(`div`,{className:`bg-white w-full max-w-md rounded-xl shadow-2xl animate-in zoom-in-95 duration-300`,children:(0,a.jsxs)(`div`,{className:`p-6`,children:[(0,a.jsxs)(`div`,{className:`flex justify-between items-start mb-4`,children:[(0,a.jsx)(`div`,{className:`w-12 h-12 rounded-lg flex items-center justify-center ${{danger:`bg-red-50 text-red-600`,warning:`bg-orange-50 text-orange-600`,info:`bg-blue-50 text-blue-600`}[f]}`,children:(0,a.jsx)(i,{size:24})}),(0,a.jsx)(`button`,{onClick:t,className:`p-2 text-slate-400 hover:text-slate-600 transition-colors`,children:(0,a.jsx)(r,{size:20})})]}),(0,a.jsx)(`h3`,{className:`text-xl font-bold text-slate-900 mb-2`,children:s}),(0,a.jsx)(`p`,{className:`text-slate-500 text-sm mb-6`,children:c}),(0,a.jsxs)(`div`,{className:`flex gap-3`,children:[(0,a.jsx)(`button`,{onClick:t,disabled:d,className:`flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50`,children:u}),(0,a.jsxs)(`button`,{onClick:o,disabled:d,className:`flex-1 ${{danger:`bg-red-600 hover:bg-red-700`,warning:`bg-orange-600 hover:bg-orange-700`,info:`bg-blue-600 hover:bg-blue-700`}[f]} text-white py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2`,children:[d&&(0,a.jsx)(n,{size:16,className:`animate-spin`}),l]})]})]})})}):null}o.__docgenInfo={description:``,methods:[],displayName:`ConfirmModal`,props:{isOpen:{required:!0,tsType:{name:`boolean`},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onConfirm:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},title:{required:!0,tsType:{name:`string`},description:``},message:{required:!0,tsType:{name:`string`},description:``},confirmText:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`"Confirm"`,computed:!1}},cancelText:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`"Cancel"`,computed:!1}},loading:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},variant:{required:!1,tsType:{name:`union`,raw:`"danger" | "warning" | "info"`,elements:[{name:`literal`,value:`"danger"`},{name:`literal`,value:`"warning"`},{name:`literal`,value:`"info"`}]},description:``,defaultValue:{value:`"danger"`,computed:!1}}}};var s={title:`UI/ConfirmModal`,component:o,tags:[`autodocs`],argTypes:{variant:{control:`select`,options:[`danger`,`warning`,`info`]},isOpen:{control:`boolean`},loading:{control:`boolean`}}},c={args:{isOpen:!0,title:`Confirm Action`,message:`Are you sure you want to proceed with this action? This cannot be undone.`,confirmText:`Confirm`,cancelText:`Cancel`,variant:`danger`,onClose:()=>console.log(`Close`),onConfirm:()=>console.log(`Confirm`)}},l={args:{isOpen:!0,title:`Warning`,message:`This action will modify your settings.`,confirmText:`Continue`,cancelText:`Go Back`,variant:`warning`,onClose:()=>console.log(`Close`),onConfirm:()=>console.log(`Confirm`)}},u={args:{isOpen:!0,title:`Information`,message:`Would you like to enable notifications?`,confirmText:`Enable`,cancelText:`Not Now`,variant:`info`,onClose:()=>console.log(`Close`),onConfirm:()=>console.log(`Confirm`)}},d={args:{isOpen:!0,title:`Processing`,message:`Please wait while we process your request.`,confirmText:`Processing...`,cancelText:`Cancel`,variant:`danger`,loading:!0,onClose:()=>console.log(`Close`),onConfirm:()=>console.log(`Confirm`)}},f={args:{isOpen:!1,title:`Confirm Action`,message:`This should not be visible.`,onClose:()=>console.log(`Close`),onConfirm:()=>console.log(`Confirm`)}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action? This cannot be undone.',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm')
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    title: 'Warning',
    message: 'This action will modify your settings.',
    confirmText: 'Continue',
    cancelText: 'Go Back',
    variant: 'warning',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm')
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    title: 'Information',
    message: 'Would you like to enable notifications?',
    confirmText: 'Enable',
    cancelText: 'Not Now',
    variant: 'info',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm')
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    title: 'Processing',
    message: 'Please wait while we process your request.',
    confirmText: 'Processing...',
    cancelText: 'Cancel',
    variant: 'danger',
    loading: true,
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm')
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    isOpen: false,
    title: 'Confirm Action',
    message: 'This should not be visible.',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm')
  }
}`,...f.parameters?.docs?.source}}};var p=[`Default`,`Warning`,`Info`,`Loading`,`Closed`];export{f as Closed,c as Default,u as Info,d as Loading,l as Warning,p as __namedExportsOrder,s as default};
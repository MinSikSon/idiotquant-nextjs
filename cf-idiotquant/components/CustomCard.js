
export default function CustomCard(props) {
    return <div className={`flex flex-nowrap w-fit px-1 pt-1 ml-1 mb-1 border rounded-xl shadow border-gray-300 ${!!props.backGround ? props.backGround : 'bg-white'}`}>
        <h5 className='whitespace-nowrap text-sm pr-2 font-bold tracking-tight text-black'>{props.title}</h5>
        <div className={`mt-0.5 whitespace-nowrap font-normal text-xs ${!!props.textColor ? props.textColor : 'text-black'} ${!!props.backGround ? props.backGround : ``} `}>{props.description}</div>
    </div>
}
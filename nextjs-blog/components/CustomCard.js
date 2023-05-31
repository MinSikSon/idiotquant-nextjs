export default function CustomCard(props) {
    return (
        <div className={`flex flex-nowrap w-fit px-4 py-1 mb-1 ml-1 border rounded-lg shadow border-gray-700 ${!!props.backGround ? props.backGround : 'bg-white'}`}>
            <h5 className='whitespace-nowrap text-base pr-2 font-bold tracking-tight text-gray-900 text-black'>{props.title}</h5>
            <p className={`mt-0.5 whitespace-nowrap font-normal text-sm ${!!props.textColor ? props.textColor : 'text-black'} ${!!props.backGround ? props.backGround : ``} `}>{props.description}</p>
        </div>
    );
}
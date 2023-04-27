export default function Card(props) {
    return (
        <div className={`flex flex-nowrap w-fit block px-4 py-1 mb-1 ml-1 border rounded-lg shadow border-gray-700 ${!!props.backGround ? props.backGround : `bg-black`}`}>
            <h5 className="whitespace-nowrap text-base pr-2 font-bold tracking-tight text-gray-900 text-white">{props.title}</h5>
            <p className={`mt-0.5 whitespace-nowrap font-normal text-sm ${!!props.textColor ? props.textColor : `text-gray-400`} ${!!props.backGround ? props.backGround : ``} `}>{props.description}</p>
        </div>
    );
}
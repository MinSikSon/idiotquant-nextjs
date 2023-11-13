import { Chip } from "@material-tailwind/react";

export default function CustomCard(props) {
    return (
        <div className={`flex flex-nowrap w-fit px-2 pt-1 ml-1 mb-1 border rounded-xl shadow border-gray-300 ${!!props.backGround ? props.backGround : 'bg-white'}`}>
            <h5 className='whitespace-nowrap text-sm pr-2 font-bold tracking-tight text-gray-900 text-black'>{props.title}</h5>
            <p className={`mt-0.5 whitespace-nowrap font-normal text-xs ${!!props.textColor ? props.textColor : 'text-black'} ${!!props.backGround ? props.backGround : ``} `}>{props.description}</p>
        </div>
        // <Chip className="p-0 px-3 mx-1 text-lg" size="sm" value={`${props.title} ${props.description}`} />
    );
}
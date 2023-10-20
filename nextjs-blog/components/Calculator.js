export default function Calculator(props) {
    const CalculatorIcon = (props) => {
        return (
            <img className='h-7' src='/images/icons8-calculator-48.png'></img>
        );
    }
    return (
        <>
            <div className={`
            ${props.scrollEffect && !props.openSearchResult ? 'translate translate-y-10' : ''}
            z-20 w-fit rounded-xl
            ${(true === props.openSearchResult) ?
                    `z-0`
                    :
                    `right-12 md:right-32 lg:right-52 xl:right-80 2xl:right-96 border-none duration-300`}
            `}>
                <form
                    onSubmit={(e) => { e.preventDefault(); }}
                    className={`
                    p-1 flex items-center ${props.openSearchResult ? 'border-b border-slate-500 mb-3 pb-3' : 'p-0.5'}
                    `}>
                    <button className='rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none'>
                        {props.openSearchResult ?
                            <>
                            </>
                            :
                            <>
                                <CalculatorIcon></CalculatorIcon>
                                인플레이션<br />계산기
                            </>
                        }
                    </button>
                </form>
            </div>
        </>
    );
}
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
            z-20 fixed w-fit top-0 rounded-xl
            ${(true === props.openSearchResult) ?
                    `z-0 bg-black duration-300 w-screen h-screen`
                    :
                    `right-10 md:right-28 lg:right-48 xl:right-72 2xl:right-96 border-none duration-300`}
            `}>
                <form
                    onSubmit={(e) => { e.preventDefault(); }}
                    className={`
                    p-1 flex items-center ${props.openSearchResult ? 'border-b border-slate-500 mb-3 pb-3' : 'p-0.5'}
                    `}>
                    <button className='rounded-3xl p-2 pr-3 inline-flex items-center justify-center text-white focus:outline-none'>
                        {props.openSearchResult ?
                            <>
                            </>
                            :
                            <>
                                <CalculatorIcon />
                            </>
                        }
                    </button>
                </form>
            </div>
        </>
    );
}
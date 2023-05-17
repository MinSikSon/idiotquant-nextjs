export default function Calculator(props) {
    const CalculatorIcon = (props) => {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="text-black w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
        );
    }
    return (
        <>
            <div className={`${props.scrollEffect && !props.openSearchResult ? 'translate translate-y-10' : ''} z-10 fixed w-fit sm:relative sm:w-80 md:relative md:w-80 top-0 rounded-xl ${(true === props.openSearchResult) ? `bg-black duration-300 w-screen h-screen` : `right-10 border-none duration-300`}`}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        // props.searchStockCompanyInfo(props.searchingList[0]?.['종목명'] || '');
                        // e.target[0].value = ''
                        // props.setOpenSearchResult(true);
                    }}
                    className={`p-1 flex items-center ${props.openSearchResult ? 'border-b border-slate-500 mb-3 pb-3' : 'p-0.5 sm:border-2 sm:border-white sm:rounded-xl md:border-2 md:border-white md:rounded-xl'}`}
                >
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
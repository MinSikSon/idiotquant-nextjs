import { PlayIcon } from "@heroicons/react/24/outline";

export default function BackTesting(props) {
  return (
    <form
      className={`flex p-0.5`}
      onSubmit={(e) => {
        e.preventDefault();
        props.setOpenedPanel("BackTestingPanel");
      }}
    >
      <button className="rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none">
        <PlayIcon strokeWidth={2} className="h-5 w-5" />
        백테스트
      </button>
    </form>
  );
}

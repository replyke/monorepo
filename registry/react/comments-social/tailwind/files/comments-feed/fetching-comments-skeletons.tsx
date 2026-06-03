import { resetDiv, CommentSkeleton } from "@sublay/ui-core-react-js";

function FetchingCommentsSkeletons() {
  return (
    <div
      style={resetDiv}
      className="flex flex-col gap-2 bg-white dark:bg-gray-800 pb-6 pr-4 pl-4"
    >
      {[1, 2, 3].map((i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

export default FetchingCommentsSkeletons;

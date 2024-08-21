export function ButtonsPanel(props: React.ComponentPropsWithoutRef<"div">) {
  return (
    <>
      <div
        {...props}
        className={`flex w-full justify-center py-3 opacity-0 ${props.className ?? ""}`}
      ></div>
      <div
        {...props}
        className={`fixed bottom-12 left-0 flex w-full justify-around overflow-x-auto border-t bg-white px-4 py-2 ${props.className ?? ""}`}
      >
        <div className="flex *:whitespace-nowrap">{props.children}</div>
      </div>
    </>
  );
}

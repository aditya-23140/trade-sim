interface Props {
  content: string;
}

const HoverElement = ({ content }: Props) => {
  return (
    <div
      className="absolute left-12 hidden group-hover:flex px-4 py-2 rounded-md backdrop-blur-lg"
      style={{ backgroundColor: "#242424a5" }}
    >
      {content}
    </div>
  );
};

export default HoverElement;

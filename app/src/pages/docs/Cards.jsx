import { Example } from "./Example.jsx";

export function ArgsTable({ caption, args }) {
  return (
    <table className="args-table">
      <caption>{caption}</caption>
      <tbody>
        {args.map((arg) => (
          <tr key={arg.name}>
            <td>
              <code>{arg.name}</code>
            </td>
            <td className="arg-type">{arg.type}</td>
            <td>{arg.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FunctionCard({ doc }) {
  return (
    <article className="function-card" id={`fn-${doc.name}`}>
      <div className="function-card-head">
        <h3>{doc.name}</h3>
        <code className="signature">{doc.signature}</code>
        <span className={`badge kind-${doc.kind ?? "function"}`}>{doc.kind ?? "function"}</span>
        <span className="badge">returns {doc.returns ?? "scalar"}</span>
      </div>
      <p className="function-summary">{doc.summary}</p>
      {doc.description ? <p className="function-description">{doc.description}</p> : null}
      {doc.args?.length ? <ArgsTable caption="Arguments" args={doc.args} /> : null}
      {doc.examples?.length ? (
        <div className="example-list">
          {doc.examples.map((example) => (
            <Example example={example} key={example.source} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ComponentCard({ doc }) {
  return (
    <article className="function-card" id={`component-${doc.name}`}>
      <div className="function-card-head">
        <h3>{doc.name}</h3>
        <code className="signature">{doc.signature}</code>
        <span className="badge kind-component">component</span>
        <span className="badge badge-role">{doc.role}</span>
      </div>
      <p className="function-summary">{doc.summary}</p>
      {doc.description ? <p className="function-description">{doc.description}</p> : null}
      {doc.args?.length ? <ArgsTable caption="Arguments" args={doc.args} /> : null}
      {doc.named?.length ? <ArgsTable caption="Named arguments" args={doc.named} /> : null}
      {doc.examples?.length ? (
        <div className="example-list">
          {doc.examples.map((example) => (
            <Example example={example} documentExample key={example.source} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

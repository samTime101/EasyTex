import { compile, FIELD_SCOPE_LABELS } from "../lib/engine.js";
import { kindLabel } from "../lib/hover-analysis.js";
import { HighlightedCode } from "./HighlightedCode.jsx";

function Example({ source, preview = false }) {
  return (
    <div className="hover-example">
      <span className="hover-example-label">Example</span>
      <HighlightedCode className="hover-code" source={source} options={{ components: true, fields: true }} />
      {preview ? <Preview source={source} /> : null}
    </div>
  );
}

function Preview({ source }) {
  const mathml = compile(source).mathml;
  if (!mathml) return null;
  return (
    <div className="hover-preview" dangerouslySetInnerHTML={{ __html: mathml }} />
  );
}

function Values({ doc }) {
  const groups = doc.valueGroups?.length
    ? doc.valueGroups
    : doc.values?.length
      ? [{ label: "Values", values: doc.values }]
      : [];
  return (
    <>
      {groups.map((group) => (
        <p className="hover-values" key={group.label}>
          <span className="hover-values-label">
            {group.defaultValue ? `${group.label} · default ${group.defaultValue}` : group.label}
          </span>
          {group.values.map((value) => (
            <code
              className={value === group.defaultValue ? "hover-chip is-default" : "hover-chip"}
              key={value}
            >
              {value}
            </code>
          ))}
        </p>
      ))}
      {doc.defaultValue ? (
        <p className="hover-values">
          <span className="hover-values-label">Default</span>
          <code className="hover-chip is-default">{doc.defaultValue}</code>
        </p>
      ) : null}
    </>
  );
}

export function HoverCard({ doc, kind }) {
  if (!doc) return null;

  if (kind === "field") {
    return (
      <div className="hover-card">
        <div className="hover-head">
          <span className="hover-title">
            <code className="hover-name">{doc.name}</code>
            {doc.type ? <span className="hover-type">{doc.type}</span> : null}
          </span>
          <span className="hover-kind">
            {FIELD_SCOPE_LABELS[doc.scope] ?? doc.scope ?? "field"}
          </span>
        </div>
        <p className="hover-summary">{doc.summary}</p>
        {doc.description ? <p className="hover-description">{doc.description}</p> : null}
        <Values doc={doc} />
        {doc.example ? <Example source={doc.example} /> : null}
      </div>
    );
  }

  const example = doc.examples?.[0];
  return (
    <div className="hover-card">
      <div className="hover-head">
        <span className="hover-title">
          <code className="hover-name">{doc.name}</code>
        </span>
        <span className="hover-kind">{kindLabel(doc)}</span>
      </div>
      <code className="hover-signature">{doc.signature}</code>
      <p className="hover-summary">{doc.summary}</p>
      {doc.description ? <p className="hover-description">{doc.description}</p> : null}
      {doc.args?.length ? (
        <ul className="hover-args">
          {doc.args.map((arg) => (
            <li key={arg.name}>
              <code className="hover-arg-name">{arg.name}</code>
              <span className="hover-type">{arg.type}</span>
              <span className="hover-arg-description">{arg.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {example ? <Example source={example.source} preview={doc.kind !== "component"} /> : null}
    </div>
  );
}

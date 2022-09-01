export { Controlled as CodeMirror } from "react-codemirror2";

import "codemirror/addon/display/placeholder";
import "codemirror/mode/xml/xml";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/yaml/yaml";
import "codemirror/mode/htmlmixed/htmlmixed";

export type CodeMirrorMode =
  | "text"
  | "xml"
  | "yaml"
  | "yaml"
  | "application/json"
  | "text/html";

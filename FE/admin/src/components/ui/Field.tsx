import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
 const id = useId()
 const errorId = `${id}-error`
 return <div className="field">
  <label className="field-label" htmlFor={id}>{label}</label>
  {isValidElement(children) ? cloneElement(children as ReactElement<{id?:string; 'aria-invalid'?:boolean; 'aria-describedby'?:string}>, {id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined}) : children}
  {error && <span id={errorId} className="field-error" role="alert">{error}</span>}
 </div>
}
export default Field

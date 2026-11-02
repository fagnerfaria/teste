import { describe,expect,it } from "vitest";
import { WORKSPACE_TEMPLATES,createWorkspace,validateWorkspacePath,upsertWorkspaceFile,removeWorkspaceFile,makeHtmlPreview,parseWorkspace } from "../lib/workspace";

describe("Web IDE workspace",()=>{
 it("starts 3 file-based templates with suitable entry files",()=>{
   expect(WORKSPACE_TEMPLATES.map(t=>t.id)).toEqual(["web","python","javascript"]);
   for(const t of WORKSPACE_TEMPLATES){const p=createWorkspace(t.id);expect(p).not.toBeNull();expect(p.files[p.entry]).toBeDefined();}
 });
 it("validates project file paths and prevents traversal",()=>{
   for(const path of ["../secret","/etc/passwd","a/../index.html","a\\foo.js",".env","https://host/x","folder//file.js"])
     expect(()=>validateWorkspacePath(path)).toThrow();
   expect(validateWorkspacePath("src/app.js")).toBe("src/app.js");
 });
 it("restricts files, total size and backup imports",()=>{
   const p=createWorkspace("web");
   expect(()=>upsertWorkspaceFile(p,"../../x","bad")).toThrow();
   expect(()=>upsertWorkspaceFile(p,"large.js","x".repeat(51000))).toThrow();
   expect(parseWorkspace(JSON.stringify({...p,files:{"../evil.js":"alert(1)"}}))).toBeNull();
   expect(parseWorkspace(JSON.stringify({...p,files:{...p.files,"large.js":"x".repeat(51000)}}))).toBeNull();
 });
 it("adds and removes without losing entry file",()=>{
   const p=createWorkspace("web");
   const next=upsertWorkspaceFile(p,"notes.txt","hello");
   expect(next.files["notes.txt"]).toBe("hello");
   const deleted=removeWorkspaceFile(next,"notes.txt");
   expect(deleted.files["notes.txt"]).toBeUndefined();
   expect(()=>removeWorkspaceFile(p,p.entry)).toThrow();
 });
 it("renders three linked HTML/CSS/JS files in sandbox",()=>{
   const p=createWorkspace("web");
   const preview=makeHtmlPreview(p);
   expect(preview).toContain("CódigoLab");
   expect(preview).toContain("<style>");
   expect(preview).toContain("<script>");
   expect(preview).toContain("Content-Security-Policy");
   expect(preview).not.toMatch(/src="https?:/);
 });
 it("never runs external script tags or network access inside preview",()=>{
   const p=createWorkspace("web");
   const edited=upsertWorkspaceFile(p,"app.js","console.log('ok');");
   const preview=makeHtmlPreview(edited);
   expect(preview).toMatch(/default-src &#39;none&#39;|default-src 'none'/);
   expect(preview).toContain("console.log('ok')");
 });
});
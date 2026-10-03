export const publicDemo = process.env.NEXT_PUBLIC_PUBLIC_DEMO === "1";
export const projectHref = (id: string) => publicDemo ? `/?view=editor&id=${encodeURIComponent(id)}` : `/project/${id}`;

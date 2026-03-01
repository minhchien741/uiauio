// Danh sách khoa cố định — dùng chung toàn bộ frontend
export const DEPARTMENTS = [
    { value: "CNTT", label: "Công nghệ thông tin" },
    { value: "KTCNS", label: "Kỹ thuật công nghệ số" },
    { value: "MTTB", label: "Mỹ thuật truyền thông báo chí" },
    { value: "KTQTS", label: "Kinh tế - Quản trị số" },
] as const;

export type DepartmentValue = typeof DEPARTMENTS[number]["value"];

export function getDepartmentLabel(value: string): string {
    return DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}

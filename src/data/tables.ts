export type TableStatus = "Free" | "Seated" | "Ordering" | "Served" | "Needs bill";

export interface DiningTable {
  id: string;
  label: string;
  section: "Main" | "Terrace" | "Bar";
  seats: number;
  status: TableStatus;
  orderNo?: string;
  amount?: number;
  openedAt?: string;
  server?: string;
}

export const initialTables: DiningTable[] = [
  { id: "t1", label: "Table 1", section: "Main", seats: 2, status: "Seated", orderNo: "#1047", amount: 27.0, openedAt: "9:01 AM", server: "Sara Ahmed" },
  { id: "t2", label: "Table 2", section: "Main", seats: 4, status: "Ordering", orderNo: "#1050", amount: 18.4, openedAt: "9:18 AM", server: "Usman Tariq" },
  { id: "t3", label: "Table 3", section: "Main", seats: 2, status: "Free" },
  { id: "t4", label: "Table 4", section: "Main", seats: 4, status: "Served", orderNo: "#1046", amount: 9.2, openedAt: "8:54 AM", server: "Sara Ahmed" },
  { id: "t5", label: "Table 5", section: "Main", seats: 6, status: "Free" },
  { id: "t6", label: "Table 6", section: "Main", seats: 2, status: "Needs bill", orderNo: "#1044", amount: 31.5, openedAt: "8:40 AM", server: "Usman Tariq" },
  { id: "t7", label: "Table 7", section: "Terrace", seats: 4, status: "Free" },
  { id: "t8", label: "Table 8", section: "Terrace", seats: 2, status: "Seated", orderNo: "#1049", amount: 12.2, openedAt: "9:12 AM", server: "Sara Ahmed" },
  { id: "t9", label: "Table 9", section: "Terrace", seats: 6, status: "Free" },
  { id: "t10", label: "Table 10", section: "Terrace", seats: 4, status: "Needs bill", orderNo: "#1043", amount: 44.0, openedAt: "8:20 AM", server: "Adeel Raza" },
  { id: "b1", label: "Bar 1", section: "Bar", seats: 1, status: "Free" },
  { id: "b2", label: "Bar 2", section: "Bar", seats: 1, status: "Seated", orderNo: "#1048", amount: 8.9, openedAt: "9:08 AM", server: "Sara Ahmed" },
  { id: "b3", label: "Bar 3", section: "Bar", seats: 1, status: "Free" },
  { id: "b4", label: "Bar 4", section: "Bar", seats: 1, status: "Free" },
];

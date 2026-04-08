import { supabase } from "./supabase";

const META_KEY = "lessonExpenseMeta";

function readMetaStore() {
    try {
        return JSON.parse(localStorage.getItem(META_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeMetaStore(store) {
    localStorage.setItem(META_KEY, JSON.stringify(store));
}

export function getExpenseMeta(expenseId) {
    const store = readMetaStore();
    return store[expenseId] || null;
}

export function saveExpenseMeta(expenseId, meta) {
    const store = readMetaStore();
    store[expenseId] = meta;
    writeMetaStore(store);
}

// Get lesson expenses for one child through RPC
export async function getLessonExpensesByChildId(childId) {
    const { data, error } = await supabase.rpc("get_parent_lesson_expenses", {
        p_child_id: childId,
    });

    if (error) throw error;
    return data || [];
}

// Add one lesson expense for one child through RPC
export async function addLessonExpense({
    childId,
    month,
    amount,
    status,
    paymentDate,
}) {
    const { data, error } = await supabase.rpc("add_parent_lesson_expense", {
        p_amount: amount,
        p_child_id: childId,
        p_month: month,
        p_payment_date: paymentDate,
        p_status: status,
    });

    if (error) throw error;
    return data;
}

// Mark one lesson expense as paid
export async function markLessonExpensePaid({ expenseId, childId }) {
    const { error } = await supabase.rpc("mark_parent_lesson_expense_paid", {
        p_expense_id: expenseId,
        p_child_id: childId,
    });

    if (error) throw error;

    return { id: expenseId };
}

// Set one lesson expense status (paid/unpaid)
export async function setLessonExpenseStatus({
    expenseId,
    childId,
    status,
    paymentDate,
}) {
    const { error } = await supabase.rpc("set_parent_lesson_expense_status", {
        p_child_id: childId,
        p_expense_id: expenseId,
        p_status: status,
        p_payment_date: paymentDate,
    });

    if (error) throw error;

    return { id: expenseId, status };
}

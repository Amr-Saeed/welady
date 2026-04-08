import { supabase } from "./supabase";

// Generate random student code like WL-A3K5L9
function generateStudentCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Generate 6 random characters (mix of letters and numbers)
    let code = '';
    for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
            // Even positions: letters
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        } else {
            // Odd positions: numbers
            code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
    }

    return `WL-${code}`;
}

// Check if student code already exists
async function isCodeUnique(code) {
    const { data } = await supabase
        .from('children')
        .select('studentCode')
        .eq('studentCode', code)
        .single();

    // If no data found, code is unique
    return !data;
}

// Generate a unique student code
async function generateUniqueStudentCode() {
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        code = generateStudentCode();
        isUnique = await isCodeUnique(code);
        attempts++;
    }

    if (!isUnique) {
        throw new Error("Failed to generate unique student code after multiple attempts");
    }

    return code;
}

// Add a new child
export async function addChild({ parentId, name, grade, age = null }) {
    try {
        console.log("👶 Adding child:", { parentId, name, grade, age });

        // Generate unique student code
        const studentCode = await generateUniqueStudentCode();
        console.log("🎟️ Generated student code:", studentCode);

        // Insert child into database
        const { error } = await supabase
            .from('children')
            .insert({
                parentID: parentId,
                name,
                grade,
                age,
                studentCode,
            });

        if (error) throw error;

        // Return the child data manually since .select() causes recursion
        const childData = {
            parentID: parentId,
            name,
            grade,
            age,
            studentCode,
        };

        console.log("✅ Child added successfully:", childData);
        return childData;
    } catch (error) {
        console.error("❌ Error adding child:", error);
        throw error;
    }
}

// Get all children for a parent
export async function getChildrenByParent(parentId) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('parentID', parentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching children:", error);
        throw error;
    }
}

// Get a single child by ID
export async function getChildById(childId) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching child:", error);
        throw error;
    }
}

// Get child by student code
export async function getChildByCode(studentCode) {
    try {
        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('studentCode', studentCode)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("❌ Error fetching child by code:", error);
        throw error;
    }
}

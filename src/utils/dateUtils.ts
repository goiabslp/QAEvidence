export const getBrazilCurrentDate = () => {
    const date = new Date();
    return new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
};

export const getBrazilDateString = () => {
    const d = getBrazilCurrentDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';

export const useUserMetrics = (userAcronym: string | undefined) => {
    const [completedCount, setCompletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCompletedCount = async () => {
        if (!userAcronym) return;
        setIsLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfDay = today.toISOString();
            
            const endOfDayDate = new Date(today);
            endOfDayDate.setHours(23, 59, 59, 999);
            const endOfDay = endOfDayDate.toISOString();

            // Count tests executed by the user today that result in completion
            // Completed statuses are Sucesso, Erro, Falha, Impedimento
            const { data, error } = await supabase
                .from('excel_test_records')
                .select('result')
                .eq('analyst', userAcronym)
                .gte('updated_at', startOfDay)
                .lte('updated_at', endOfDay);

            if (error) throw error;

            let count = 0;
            (data || []).forEach((item: any) => {
                const status = (item.result || '').toLowerCase();
                // Exclude Pendente and Em Andamento (standardized logic from DailyMetricsModal)
                const isCompleted = status.includes('sucesso') || 
                                  status.includes('erro') || 
                                  status.includes('falha') || 
                                  status.includes('impedimento');
                
                if (isCompleted) {
                    count++;
                }
            });

            setCompletedCount(count);
        } catch (error) {
            console.error('Error fetching header metrics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!userAcronym) return;
        fetchCompletedCount();

        // Realtime subscription
        const channel = supabase.channel(`header_metrics_${userAcronym}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'excel_test_records',
                    filter: `analyst=eq.${userAcronym}`
                },
                () => {
                    fetchCompletedCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userAcronym]);

    return { completedCount, isLoading, refresh: fetchCompletedCount };
};

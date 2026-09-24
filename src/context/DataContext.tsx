import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Client,
  AllocationBatch,
  Allocation,
  ActivityLog,
  PTPRecord,
  PaymentRecord,
  ExceptionPayment,
  DispositionCode,
  ContactMode,
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_BATCHES,
  INITIAL_ALLOCATIONS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_PTPS,
  INITIAL_PAYMENTS,
  INITIAL_EXCEPTIONS,
} from '../mock/initialData';
import { useAuth } from './AuthContext';

interface AllocationFilter {
  clientId?: string;
  dpdBucket?: string;
  city?: string;
  minPos?: number;
  maxPos?: number;
}

interface DataContextType {
  clients: Client[];
  batches: AllocationBatch[];
  allocations: Allocation[];
  activityLogs: ActivityLog[];
  ptpRecords: PTPRecord[];
  payments: PaymentRecord[];
  exceptions: ExceptionPayment[];

  // Core Actions
  createClient: (client: Client) => void;
  uploadAllocationBatch: (
    clientId: string,
    fileName: string,
    records: Partial<Allocation>[],
    monthTag: string
  ) => { success: boolean; batchId?: string; count?: number; errors?: string[] };

  assignRoundRobin: (allocationIds: string[], agentIds: string[]) => void;
  assignBulkByFilter: (filter: AllocationFilter, targetAgentId: string) => number;
  reassignAllocation: (allocationId: string, newAgentId: string, oldAgentId: string) => void;

  captureDisposition: (
    allocationId: string,
    agentId: string,
    contactMode: ContactMode,
    dispositionCode: DispositionCode,
    remarks: string,
    nextActionDate?: string,
    promisedAmount?: number,
    promisedDate?: string
  ) => void;

  ingestPaymentFile: (
    clientId: string,
    fileName: string,
    paymentsData: { loan_id: string; payment_amount: number; payment_date: string; payment_mode: string }[]
  ) => { matchedCount: number; exceptionCount: number; totalAmount: number };

  resolveException: (exceptionId: string, action: 'MATCH_MANUALLY' | 'REJECT', targetAllocationId?: string) => void;
  
  runPtpLifecycleCheck: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, addAuditLog } = useAuth();

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('nexlance_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [batches, setBatches] = useState<AllocationBatch[]>(() => {
    const saved = localStorage.getItem('nexlance_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    const saved = localStorage.getItem('nexlance_allocations');
    return saved ? JSON.parse(saved) : INITIAL_ALLOCATIONS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('nexlance_activity_logs');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
  });

  const [ptpRecords, setPtpRecords] = useState<PTPRecord[]>(() => {
    const saved = localStorage.getItem('nexlance_ptp_records');
    return saved ? JSON.parse(saved) : INITIAL_PTPS;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('nexlance_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [exceptions, setExceptions] = useState<ExceptionPayment[]>(() => {
    const saved = localStorage.getItem('nexlance_exceptions');
    return saved ? JSON.parse(saved) : INITIAL_EXCEPTIONS;
  });

  useEffect(() => localStorage.setItem('nexlance_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('nexlance_batches', JSON.stringify(batches)), [batches]);
  useEffect(() => localStorage.setItem('nexlance_allocations', JSON.stringify(allocations)), [allocations]);
  useEffect(() => localStorage.setItem('nexlance_activity_logs', JSON.stringify(activityLogs)), [activityLogs]);
  useEffect(() => localStorage.setItem('nexlance_ptp_records', JSON.stringify(ptpRecords)), [ptpRecords]);
  useEffect(() => localStorage.setItem('nexlance_payments', JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem('nexlance_exceptions', JSON.stringify(exceptions)), [exceptions]);

  useEffect(() => {
    runPtpLifecycleCheck();
  }, []);

  const runPtpLifecycleCheck = () => {
    const today = new Date().toISOString().split('T')[0];
    
    setPtpRecords(prev =>
      prev.map(ptp => {
        if (ptp.ptp_status === 'Open' && ptp.promised_date < today) {
          const allocation = allocations.find(a => a.allocation_id === ptp.allocation_id);
          const hasPayment = payments.some(
            p => allocation && p.client_id === allocation.client_id && p.loan_id.toUpperCase() === allocation.loan_id.toUpperCase()
          );

          if (!hasPayment) {
            if (allocation) {
              setAllocations(allocs =>
                allocs.map(a => (a.allocation_id === allocation.allocation_id ? { ...a, current_status: 'In Progress' } : a))
              );
            }
            return {
              ...ptp,
              ptp_status: 'Broken',
              broken_reason: 'Automated check: No payment received by promised_date + 1 day',
            };
          }
        }
        return ptp;
      })
    );
  };

  const createClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'CLIENT_CREATED',
      entity: 'clients',
      entity_id: client.client_id,
      new_value: `Created client ${client.client_name} with ${client.data_retention_days} days retention`,
    });
  };

  const uploadAllocationBatch = (
    clientId: string,
    fileName: string,
    records: Partial<Allocation>[],
    monthTag: string
  ) => {
    const client = clients.find(c => c.client_id === clientId);
    if (!client) return { success: false, errors: [`Client ${clientId} not found`] };

    const errors: string[] = [];
    const newAllocations: Allocation[] = [];
    const batchId = `BATCH_${Date.now()}`;

    records.forEach((row, idx) => {
      if (!row.loan_id) {
        errors.push(`Row ${idx + 1}: Missing required field loan_id`);
        return;
      }
      if (!row.borrower_name) {
        errors.push(`Row ${idx + 1}: Missing required field borrower_name for loan ${row.loan_id}`);
        return;
      }

      const normalizedLoanId = row.loan_id.trim().toUpperCase();
      const existingOpen = allocations.find(
        a => a.client_id === clientId && a.loan_id.trim().toUpperCase() === normalizedLoanId && a.current_status !== 'Closed' && a.current_status !== 'Paid'
      );

      if (existingOpen) {
        errors.push(`Row ${idx + 1}: Loan ID ${row.loan_id} already has an open allocation in system (ID: ${existingOpen.allocation_id}). Deduplicated.`);
        return;
      }

      const dpd = Number(row.dpd) || 0;
      let dpd_bucket: Allocation['dpd_bucket'] = '1-30 DPD';
      if (dpd > 90) dpd_bucket = '90+ DPD';
      else if (dpd > 60) dpd_bucket = '61-90 DPD';
      else if (dpd > 30) dpd_bucket = '31-60 DPD';

      const pos = Number(row.pos_amount) || 0;
      const emi = Number(row.emi_due_amount) || 0;
      const total = Number(row.total_due) || pos + emi;

      newAllocations.push({
        allocation_id: `ALL_${Date.now()}_${idx}`,
        batch_id: batchId,
        client_id: clientId,
        loan_id: normalizedLoanId,
        borrower_name: row.borrower_name.trim(),
        borrower_phone: (row.borrower_phone || '9876543210').toString().trim(),
        borrower_city: row.borrower_city || 'Metro City',
        dpd,
        dpd_bucket,
        pos_amount: pos,
        emi_due_amount: emi,
        total_due: total,
        current_status: 'Unassigned',
      });
    });

    if (newAllocations.length === 0) {
      return { success: false, errors: errors.length > 0 ? errors : ['No valid records found in file'] };
    }

    const newBatch: AllocationBatch = {
      batch_id: batchId,
      client_id: clientId,
      uploaded_by: currentUser.agent_id,
      uploaded_at: new Date().toISOString(),
      file_name: fileName,
      record_count: newAllocations.length,
      month_tag: monthTag,
    };

    setBatches(prev => [newBatch, ...prev]);
    setAllocations(prev => [...newAllocations, ...prev]);

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'BATCH_UPLOADED',
      entity: 'allocation_batches',
      entity_id: batchId,
      new_value: `Uploaded batch ${batchId} with ${newAllocations.length} records for ${client.client_name}`,
    });

    return { success: true, batchId, count: newAllocations.length, errors: errors.length > 0 ? errors : undefined };
  };

  const assignRoundRobin = (allocationIds: string[], agentIds: string[]) => {
    if (agentIds.length === 0) return;

    let agentIdx = 0;
    const now = new Date().toISOString();

    setAllocations(prev =>
      prev.map(alloc => {
        if (allocationIds.includes(alloc.allocation_id)) {
          const assignedAgent = agentIds[agentIdx % agentIds.length];
          agentIdx++;
          return {
            ...alloc,
            assigned_agent_id: assignedAgent,
            assigned_at: now,
            current_status: 'Assigned',
          };
        }
        return alloc;
      })
    );

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'REASSIGN_ACCOUNT',
      entity: 'allocations',
      entity_id: `${allocationIds.length} accounts`,
      new_value: `Distributed ${allocationIds.length} accounts via Round Robin across ${agentIds.length} agents`,
    });
  };

  const assignBulkByFilter = (filter: AllocationFilter, targetAgentId: string) => {
    const now = new Date().toISOString();
    let count = 0;

    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.current_status === 'Unassigned') {
          if (filter.clientId && alloc.client_id !== filter.clientId) return alloc;
          if (filter.dpdBucket && alloc.dpd_bucket !== filter.dpdBucket) return alloc;
          if (filter.city && alloc.borrower_city.toLowerCase() !== filter.city.toLowerCase()) return alloc;
          if (filter.minPos && alloc.pos_amount < filter.minPos) return alloc;
          if (filter.maxPos && alloc.pos_amount > filter.maxPos) return alloc;

          count++;
          return {
            ...alloc,
            assigned_agent_id: targetAgentId,
            assigned_at: now,
            current_status: 'Assigned',
          };
        }
        return alloc;
      })
    );

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'REASSIGN_ACCOUNT',
      entity: 'allocations',
      entity_id: `Bulk Filter (${count} items)`,
      new_value: `Bulk assigned ${count} unassigned items to agent ${targetAgentId}`,
    });

    return count;
  };

  const reassignAllocation = (allocationId: string, newAgentId: string, oldAgentId: string) => {
    const now = new Date().toISOString();
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.allocation_id === allocationId
          ? { ...alloc, assigned_agent_id: newAgentId, assigned_at: now }
          : alloc
      )
    );

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'REASSIGN_ACCOUNT',
      entity: 'allocations',
      entity_id: allocationId,
      old_value: `Assigned to ${oldAgentId}`,
      new_value: `Reassigned to ${newAgentId}`,
    });
  };

  const captureDisposition = (
    allocationId: string,
    agentId: string,
    contactMode: ContactMode,
    dispositionCode: DispositionCode,
    remarks: string,
    nextActionDate?: string,
    promisedAmount?: number,
    promisedDate?: string
  ) => {
    const now = new Date().toISOString();
    const activityId = `ACT_${Date.now()}`;

    const newActivity: ActivityLog = {
      activity_id: activityId,
      allocation_id: allocationId,
      agent_id: agentId,
      timestamp: now,
      contact_mode: contactMode,
      disposition_code: dispositionCode,
      remarks,
      next_action_date: nextActionDate,
    };
    setActivityLogs(prev => [newActivity, ...prev]);

    if (dispositionCode === 'PTP Taken' && promisedAmount && promisedDate) {
      const ptpId = `PTP_${Date.now()}`;
      const newPtp: PTPRecord = {
        ptp_id: ptpId,
        allocation_id: allocationId,
        agent_id: agentId,
        created_at: now,
        promised_amount: promisedAmount,
        promised_date: promisedDate,
        ptp_status: 'Open',
      };
      setPtpRecords(prev => [newPtp, ...prev]);

      addAuditLog({
        user_id: agentId,
        action_type: 'PTP_CREATED',
        entity: 'ptp',
        entity_id: ptpId,
        new_value: `Created PTP of Rs. ${promisedAmount} due on ${promisedDate}`,
      });
    }

    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.allocation_id === allocationId) {
          let status: Allocation['current_status'] = 'In Progress';
          if (dispositionCode === 'PTP Taken') status = 'PTP Taken';
          else if (dispositionCode === 'Already Paid') status = 'Paid';
          else if (dispositionCode === 'Dispute Raised') status = 'Disputed';

          return {
            ...alloc,
            current_status: status,
            last_action_at: now,
          };
        }
        return alloc;
      })
    );

    addAuditLog({
      user_id: agentId,
      action_type: 'DISPOSITION_CAPTURED',
      entity: 'activity_log',
      entity_id: activityId,
      new_value: `Disposition [${dispositionCode}] recorded for allocation ${allocationId}`,
    });
  };

  const ingestPaymentFile = (
    clientId: string,
    fileName: string,
    paymentsData: { loan_id: string; payment_amount: number; payment_date: string; payment_mode: string }[]
  ) => {
    let matchedCount = 0;
    let exceptionCount = 0;
    let totalAmount = 0;
    const fileId = `FILE_PAY_${Date.now()}`;
    const now = new Date().toISOString();

    const newPaymentRecords: PaymentRecord[] = [];
    const newExceptions: ExceptionPayment[] = [];

    paymentsData.forEach(row => {
      const normalizedLoanId = row.loan_id.trim().toUpperCase();
      totalAmount += row.payment_amount;

      const targetAlloc = allocations.find(
        a => a.client_id === clientId && a.loan_id.trim().toUpperCase() === normalizedLoanId
      );

      if (targetAlloc) {
        matchedCount++;
        const payId = `PAY_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        newPaymentRecords.push({
          payment_id: payId,
          client_id: clientId,
          loan_id: normalizedLoanId,
          payment_date: row.payment_date,
          payment_amount: row.payment_amount,
          payment_mode: row.payment_mode || 'ONLINE',
          source_file_id: fileName,
          ingested_at: now,
        });

        const isFull = row.payment_amount >= targetAlloc.total_due;
        const newStatus: Allocation['current_status'] = isFull ? 'Paid' : 'Partially Paid';

        setAllocations(prev =>
          prev.map(a =>
            a.allocation_id === targetAlloc.allocation_id
              ? {
                  ...a,
                  current_status: newStatus,
                  last_action_at: now,
                  closure_reason: `Reconciled payment of Rs ${row.payment_amount} from file ${fileName}`,
                }
              : a
          )
        );

        setPtpRecords(prev =>
          prev.map(ptp => {
            if (ptp.allocation_id === targetAlloc.allocation_id && ptp.ptp_status === 'Open') {
              if (ptp.promised_date <= row.payment_date) {
                return {
                  ...ptp,
                  ptp_status: isFull ? 'Kept' : 'Partially Kept',
                };
              }
            }
            return ptp;
          })
        );
      } else {
        exceptionCount++;
        newExceptions.push({
          exception_id: `EXC_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          client_id: clientId,
          loan_id: normalizedLoanId,
          payment_date: row.payment_date,
          payment_amount: row.payment_amount,
          payment_mode: row.payment_mode || 'ONLINE',
          reason: `Loan ID ${normalizedLoanId} not found in client allocation records`,
          status: 'PENDING',
        });
      }
    });

    setPayments(prev => [...newPaymentRecords, ...prev]);
    setExceptions(prev => [...newExceptions, ...prev]);

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'PAYMENT_INGESTED',
      entity: 'payments',
      entity_id: fileId,
      new_value: `Ingested ${paymentsData.length} records. ${matchedCount} matched, ${exceptionCount} routed to exception queue. Total: Rs. ${totalAmount}`,
    });

    return { matchedCount, exceptionCount, totalAmount };
  };

  const resolveException = (exceptionId: string, action: 'MATCH_MANUALLY' | 'REJECT', targetAllocationId?: string) => {
    setExceptions(prev =>
      prev.map(exc => {
        if (exc.exception_id === exceptionId) {
          return {
            ...exc,
            status: action === 'MATCH_MANUALLY' ? 'RESOLVED' : 'REJECTED',
          };
        }
        return exc;
      })
    );

    if (action === 'MATCH_MANUALLY' && targetAllocationId) {
      setAllocations(prev =>
        prev.map(a => (a.allocation_id === targetAllocationId ? { ...a, current_status: 'Paid' } : a))
      );
    }
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        batches,
        allocations,
        activityLogs,
        ptpRecords,
        payments,
        exceptions,
        createClient,
        uploadAllocationBatch,
        assignRoundRobin,
        assignBulkByFilter,
        reassignAllocation,
        captureDisposition,
        ingestPaymentFile,
        resolveException,
        runPtpLifecycleCheck,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

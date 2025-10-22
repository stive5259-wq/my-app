// FEAT-008A stub: reserved for FEAT-008B integration (note-event scheduler)
// Export minimal types to unblock later imports; UI does not use this module yet.
export type TiePlan = {
  sustainPCsGlobal: number[];
  sustainNextPCs: Map<number, number[]>;
};

export function computeTiePlanStub(): TiePlan {
  return { sustainPCsGlobal: [], sustainNextPCs: new Map() };
}

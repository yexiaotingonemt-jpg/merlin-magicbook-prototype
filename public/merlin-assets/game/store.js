export let state;

export const runtime = {
  currentView: "explore",
  pendingElement: null,
};

export function setState(nextState) {
  state = nextState;
  return state;
}

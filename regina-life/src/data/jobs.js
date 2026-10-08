/** Career definitions. Wage is paid per completed shift — and only after the tasks were genuinely done. */
export const JOBS = {
  retail: {
    id: 'retail', title: 'Retail Associate', employer: 'Prairie Corner Market', contact: 'market',
    blurb: 'Stock shelves and keep the aisles tidy. Carry boxes from the back room to the right shelves.',
    place: 'market', taskVerb: 'Stock shelf', applyDelay: 25,
    levels: [
      { name: 'Associate',        wage: 9500,  xpNeeded: 0,   tasks: 4 },
      { name: 'Senior Associate', wage: 12500, xpNeeded: 100, tasks: 5 },
      { name: 'Shift Lead',       wage: 16500, xpNeeded: 260, tasks: 6 },
    ],
  },
  stylist: {
    id: 'stylist', title: 'Sales Floor Stylist', employer: 'Prairie Threads', contact: 'threads',
    blurb: 'Refold displays and restock racks. Keep the floor looking sharp for customers.',
    place: 'threads', taskVerb: 'Restock rack', applyDelay: 25,
    levels: [
      { name: 'Floor Stylist',  wage: 10500, xpNeeded: 0,   tasks: 4 },
      { name: 'Lead Stylist',   wage: 14000, xpNeeded: 120, tasks: 5 },
      { name: 'Store Manager',  wage: 19500, xpNeeded: 300, tasks: 6 },
    ],
  },
};
export const XP_PER_TASK = 10;
export const MIN_SECONDS_PER_TASK = 6; // anti-exploit: a shift can't be completed faster than this

export const entityContactGateSource = `
world.onEntityContact(event => {
  event.tick;
  event.entity;
  event.other;
  event.axis;
  event.force;
});
world.nextEntityContact();
world.onContact(event => event.collider);
world.onContactSeparate(event => event.collider);
`;

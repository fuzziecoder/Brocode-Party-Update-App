export const dataStore = {
  users: [
    {
      id: 'u-1',
      username: 'brocode',
      password: 'changeme',
      name: 'Ram',
      role: 'admin',
    },
    {
      id: 'u-2',
      username: 'dhanush',
      password: 'changeme',
      name: 'Dhanush',
      role: 'user',
    },
  ],
  spots: [
    {
      id: 'spot-2025-07-26',
      location: 'Attibele Toll Plaza',
      date: '2025-07-26T10:00:00.000Z',
      hostUserId: 'u-1',
    },
  ],
  catalog: {
    drinks: [
      { id: 'd-1', name: 'Brocode Beer', price: 180 },
      { id: 'd-2', name: 'Kingfisher Beer', price: 170 },
    ],
    food: [
      { id: 'f-1', name: 'Beef Biriyani', price: 220 },
      { id: 'f-2', name: 'Parotta', price: 30 },
    ],
    cigarettes: [
      { id: 'c-1', name: 'Marlboro', price: 25 },
      { id: 'c-2', name: 'Classic', price: 20 },
    ],
  },
  orders: [
    {
      id: 'ord-1',
      spotId: 'spot-2025-07-26',
      userId: 'u-2',
      items: [
        {
          productId: 'd-1',
          name: 'Brocode Beer',
          quantity: 2,
          unitPrice: 180,
          total: 360,
        },
      ],
      totalAmount: 360,
      createdAt: '2025-07-26T10:30:00.000Z',
    },
  ],
};

const createOrder = (req, res) => {
  const { items, tableNumber } = req.body;
  res.status(201).json({ message: 'Order created', data: { items, tableNumber, status: 'Pending' } });
};

const getOrders = (req, res) => {
  res.status(200).json({ message: 'List of orders fetched', data: [] });
};

module.exports = { createOrder, getOrders };

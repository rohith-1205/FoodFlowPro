const registerUser = (req, res) => {
  // Logic to register a user
  const { name, email, role } = req.body;
  res.status(201).json({ message: 'User registered successfully', data: { name, email, role } });
};

const loginUser = (req, res) => {
  // Logic to login a user
  const { email, password } = req.body;
  res.status(200).json({ message: 'Login successful', token: 'fake-jwt-token' });
};

module.exports = { registerUser, loginUser };

const express = require('express');
const app = express()
const port = process.env.PORT || 5000;  
const cors = require('cors');
const dns = require('dns');
const crypto = require('crypto');
require('dotenv').config()

app.use(cors());
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.urlencoded({ extended: true }));

dns.setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.ot66xwb.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const UserCollection = client.db('food-ordering').collection('users');
    const FoodsCollection = client.db('food-ordering').collection('foods');
    const CartCollection = client.db('food-ordering').collection('carts'); 
    const OrdersCollection = client.db('food-ordering').collection('orders'); 

    // ---------- User APIs ----------
    app.get('/users', async (req, res) => {
      try {
        const result = await UserCollection.find().toArray();
        res.json({
          success: true,
          data: result,
          count: result.length
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const existingUser = await UserCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "User already exists!"
          });
        }
        const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "Customer";
        user.role = role;
        user.createdAt = new Date().toISOString();
        user.updatedAt = new Date().toISOString();
        const result = await UserCollection.insertOne(user);
        res.json({
          success: true,
          message: "User created successfully",
          data: result,
          user: { ...user, _id: result.insertedId }
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/users/email/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
        const result = await UserCollection.findOne(query);
        if (!result) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        const normalizedUser = {
          ...result,
          role: result.role ? result.role.charAt(0).toUpperCase() + result.role.slice(1).toLowerCase() : "Customer"
        };
        res.json({ success: true, data: normalizedUser });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.put('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedUser = req.body;
        delete updatedUser._id;
        if (updatedUser.role) {
          updatedUser.role = updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1).toLowerCase();
        }
        const query = { _id: new ObjectId(id) };
        const result = await UserCollection.updateOne(query, { $set: updatedUser });
        res.json({
          success: true,
          message: "User updated successfully",
          modifiedCount: result.modifiedCount,
          data: updatedUser
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await UserCollection.deleteOne(query);
        res.json({
          success: true,
          message: "User deleted successfully",
          deletedCount: result.deletedCount
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // ---------- Foods APIs ----------
    app.get('/foods', async (req, res) => {
      try {
        const result = await FoodsCollection.find().toArray();
        res.json({
          success: true,
          data: result,
          count: result.length
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/foods', async (req, res) => {
      try {
        const food = req.body;
        const result = await FoodsCollection.insertOne(food);
        res.json({
          success: true,
          message: "Food created successfully",
          data: result
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await FoodsCollection.deleteOne(query);
        res.json({
          success: true,
          message: "Food deleted successfully",
          deletedCount: result.deletedCount
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.put('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedFood = req.body;
        delete updatedFood._id;
        const query = { _id: new ObjectId(id) };
        const result = await FoodsCollection.updateOne(query, { $set: updatedFood });
        res.json({
          success: true,
          message: "Food updated successfully",
          modifiedCount: result.modifiedCount
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // ---------- Cart APIs ----------
    app.post('/cart', async (req, res) => {
      try {
        const { email, items } = req.body;
        
        if (!email) {
          return res.status(400).json({ success: false, message: "Email is required" });
        }

        const existingCart = await CartCollection.findOne({ email });

        if (existingCart) {
          const result = await CartCollection.updateOne(
            { email },
            { $set: { items, updatedAt: new Date().toISOString() } }
          );
          res.json({
            success: true,
            message: "Cart updated successfully",
            data: result
          });
        } else {
          const newCart = {
            email,
            items,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const result = await CartCollection.insertOne(newCart);
          res.json({
            success: true,
            message: "Cart created successfully",
            data: result
          });
        }
      } catch (error) {
        console.error("Error saving cart:", error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
    
    app.get('/cart', async (req, res) => {
      try {
        const carts = await CartCollection.find().toArray();
        res.json({
          success: true,
          data: carts
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/cart/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const cart = await CartCollection.findOne({ email });
        
        if (!cart) {
          return res.json({
            success: true,
            data: { email, items: [] }
          });
        }
        
        res.json({
          success: true,
          data: cart
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/cart/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const result = await CartCollection.deleteOne({ email });
        res.json({
          success: true,
          message: "Cart cleared successfully",
          data: result
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/cart/:email/item/:itemId', async (req, res) => {
      try {
        const email = req.params.email;
        const itemId = req.params.itemId;

        const result = await CartCollection.updateOne(
          { email },
          { $pull: { items: { _id: itemId } } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        const updatedCart = await CartCollection.findOne({ email });
        const itemsCount = updatedCart?.items?.length || 0;

        if (itemsCount === 0) {
          await CartCollection.deleteOne({ email });
          res.json({
            success: true,
            message: "Item removed, cart is now empty and deleted",
            cartEmpty: true,
            itemsCount: 0
          });
        } else {
          res.json({
            success: true,
            message: "Item removed from cart successfully",
            cartEmpty: false,
            itemsCount: itemsCount,
            data: result
          });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // ---------- Orders APIs ----------
    app.post('/orders', async (req, res) => {
      try {
        const orderData = {
          email: req.body.email,
          customerName: req.body.customerName,
          phone: req.body.phone,
          address: req.body.address,
          deliveryNote: req.body.deliveryNote || '',
          paymentMethod: req.body.paymentMethod || 'cash',
          items: req.body.items || [],
          subtotal: req.body.subtotal || 0,
          deliveryFee: req.body.deliveryFee || 2.00,
          total: req.body.total || 0,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        console.log("customer data",req.body)

        const result = await OrdersCollection.insertOne(orderData);
        console.log("ORDER SAVED:", result);

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    });

    app.get('/orders', async (req, res) => {
      try {
        console.log("🔍 Fetching all orders...");
        const orders = await OrdersCollection.find().toArray();
        console.log(`✅ Found ${orders.length} orders`);
        
        res.json({
          success: true,
          data: orders,
          count: orders.length
        });
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res.status(500).json({ 
          success: false, 
          message: error.message,
          data: [] 
        });
      }
    });
    
    app.get('/orders/check/:orderId', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        
        let order = await OrdersCollection.findOne({ 
          $or: [
            { _id: new ObjectId(orderId) },
            { merchantOrderId: orderId },
            { orderId: orderId }
          ]
        });
        
        if (!order) {
          try {
            order = await OrdersCollection.findOne({ 
              merchantOrderId: orderId 
            });
          } catch (error) {
            order = null;
          }
        }
        
        if (!order) {
          return res.json({
            success: false,
            message: "Order not found"
          });
        }
        
        res.json({
          success: true,
          data: order
        });
      } catch (error) {
        console.error('❌ Order check error:', error);
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    app.put('/orders/status/:orderId', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const { status, transactionId, paymentStatus, paymentMethod, paidAt } = req.body;
        
        console.log(`📝 Updating order ${orderId} status to ${status || 'Paid'}`);
        
        let order = await OrdersCollection.findOne({ 
          $or: [
            { _id: new ObjectId(orderId) },
            { merchantOrderId: orderId },
            { orderId: orderId }
          ]
        });
        
        if (!order) {
          try {
            order = await OrdersCollection.findOne({ 
              $or: [
                { _id: new ObjectId(orderId) },
                { merchantOrderId: orderId }
              ]
            });
          } catch (error) {
            order = await OrdersCollection.findOne({ 
              merchantOrderId: orderId 
            });
          }
        }
        
        if (!order) {
          return res.status(404).json({ 
            success: false, 
            message: "Order not found" 
          });
        }
        
        const updateData = {
          status: status || 'Paid',
          updatedAt: new Date().toISOString(),
          paymentStatus: paymentStatus || 'success'
        };
        
        if (transactionId) {
          updateData.transactionId = transactionId;
        }
        
        if (paymentMethod) {
          updateData.paymentMethod = paymentMethod;
        }
        
        if (paidAt) {
          updateData.paidAt = paidAt;
        }
        
        const result = await OrdersCollection.updateOne(
          { _id: order._id },
          { $set: updateData }
        );
        
        console.log(`✅ Order ${orderId} updated to PAID successfully`);
        
        res.json({
          success: true,
          message: "Order status updated to PAID",
          data: result
        });
        
      } catch (error) {
        console.error('❌ Order update error:', error);
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    app.put('/orders/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid order ID format" 
          });
        }
        
        if (!status) {
          return res.status(400).json({
            success: false,
            message: "Status is required"
          });
        }
        
        const result = await OrdersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date().toISOString() } }
        );
        
        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found or status unchanged"
          });
        }
        
        res.json({
          success: true,
          message: "Order status updated successfully",
          data: result
        });
      } catch (error) {
        console.error("❌ Status update error:", error);
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    app.put('/orders/status-update/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid order ID format" 
          });
        }
        
        if (!status) {
          return res.status(400).json({
            success: false,
            message: "Status is required"
          });
        }
        
        const validStatuses = ['On the way', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
          });
        }
        
        const result = await OrdersCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              status: status, 
              updatedAt: new Date().toISOString() 
            } 
          }
        );
        
        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found or status unchanged"
          });
        }
        
        res.json({
          success: true,
          message: `Order status updated to ${status}`,
          data: result
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    app.get('/orders/:email', async (req, res) => {
      try {
        const email = req.params.email;
        console.log(`🔍 Fetching orders for email: ${email}`);
        
        const orders = await OrdersCollection.find({ 
          email: { $regex: new RegExp(`^${email}$`, 'i') } 
        }).toArray();
        
        console.log(`✅ Found ${orders.length} orders for ${email}`);
        
        res.json({
          success: true,
          data: orders,
          count: orders.length
        });
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res.status(500).json({ 
          success: false, 
          message: error.message,
          data: [] 
        });
      }
    });

    app.delete('/orders/:id', async (req, res) => {
      try {
        const id = req.params.id;
        console.log(`🗑️ Deleting order: ${id}`);
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid order ID format" 
          });
        }
        
        const result = await OrdersCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: "Order not found" 
          });
        }

        console.log(`✅ Order deleted: ${id}`);
        res.json({ 
          success: true, 
          message: "Order deleted successfully",
          deletedCount: result.deletedCount
        });
      } catch (error) {
        console.error("❌ Delete error:", error);
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    app.put('/orders/:orderId/item/:itemId/decrease', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const itemId = req.params.itemId;
        
        console.log(`📉 Decreasing quantity for item ${itemId} in order ${orderId}`);
        
        if (!ObjectId.isValid(orderId)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid order ID format" 
          });
        }
        
        const order = await OrdersCollection.findOne({ _id: new ObjectId(orderId) });
        
        if (!order) {
          return res.status(404).json({ 
            success: false, 
            message: "Order not found" 
          });
        }
        
        if (order.status === 'Paid' || order.status === 'Delivered') {
          return res.status(403).json({
            success: false,
            message: "Cannot modify paid or delivered orders"
          });
        }
        
        const itemIndex = order.items.findIndex(item => {
          const itemIdStr = typeof item._id === 'object' && item._id.$oid ? item._id.$oid : String(item._id);
          return itemIdStr === itemId;
        });
        
        if (itemIndex === -1) {
          return res.status(404).json({ 
            success: false, 
            message: "Item not found in order" 
          });
        }
        
        if (order.items[itemIndex].quantity > 1) {
          order.items[itemIndex].quantity -= 1;
        } else {
          order.items.splice(itemIndex, 1);
        }
        
        if (order.items.length === 0) {
          await OrdersCollection.deleteOne({ _id: new ObjectId(orderId) });
          console.log(`✅ Order deleted as it became empty: ${orderId}`);
          return res.json({ 
            success: true, 
            message: "Last item removed, order deleted",
            orderEmpty: true
          });
        }
        
        const newTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + (order.deliveryFee || 0);
        
        const result = await OrdersCollection.updateOne(
          { _id: new ObjectId(orderId) },
          { 
            $set: { 
              items: order.items, 
              total: newTotal,
              updatedAt: new Date().toISOString() 
            } 
          }
        );
        
        console.log(`✅ Quantity decreased for item in order ${orderId}`);
        res.json({ 
          success: true, 
          message: "Quantity decreased successfully"
        });
      } catch (error) {
        console.error("❌ Error decreasing quantity:", error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete('/orders/:orderId/item/:itemId', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const itemId = req.params.itemId;
        
        console.log(`🗑️ Deleting item ${itemId} from order ${orderId}`);
        
        if (!ObjectId.isValid(orderId)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid order ID format" 
          });
        }
        
        const order = await OrdersCollection.findOne({ _id: new ObjectId(orderId) });
        
        if (!order) {
          return res.status(404).json({ 
            success: false, 
            message: "Order not found" 
          });
        }
        
        if (order.status === 'Paid' || order.status === 'Delivered') {
          return res.status(403).json({
            success: false,
            message: "Cannot delete items from paid or delivered orders"
          });
        }
        
        const updatedItems = order.items.filter(item => {
          const itemIdStr = typeof item._id === 'object' && item._id.$oid ? item._id.$oid : String(item._id);
          return itemIdStr !== itemId;
        });
        
        if (updatedItems.length === order.items.length) {
          return res.status(404).json({ 
            success: false, 
            message: "Item not found in order" 
          });
        }
        
        const result = await OrdersCollection.updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { items: updatedItems, updatedAt: new Date().toISOString() } }
        );
        
        if (result.modifiedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: "Failed to update order" 
          });
        }
        
        if (updatedItems.length === 0) {
          await OrdersCollection.deleteOne({ _id: new ObjectId(orderId) });
          console.log(`✅ Order deleted as it became empty: ${orderId}`);
          return res.json({ 
            success: true, 
            message: "Last item deleted, order removed",
            orderEmpty: true
          });
        }
        
        console.log(`✅ Item deleted from order ${orderId}`);
        res.json({ 
          success: true, 
          message: "Item deleted successfully"
        });
      } catch (error) {
        console.error("❌ Error deleting item:", error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // ---------- Payment APIs ----------
    app.post('/create-payment-v2', async (req, res) => {
      try {
        const { orderId, realOrderId, amount, customerName, customerEmail, customerPhone } = req.body;

        console.log('📝 Payment Request:', { orderId, realOrderId, amount });

        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_SECRET;
        const formattedAmount = parseFloat(amount).toFixed(2);
        const currency = 'LKR';

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hashString = merchantId + orderId + formattedAmount + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        const params = {
          merchant_id: merchantId,
          return_url: `${process.env.PAYHERE_RETURN_URL}?real_order_id=${realOrderId || ''}`,
          cancel_url: process.env.PAYHERE_CANCEL_URL,
          notify_url: process.env.PAYHERE_NOTIFY_URL,
          order_id: orderId,
          items: 'Food Order Payment',
          amount: formattedAmount,
          currency: currency,
          hash: hash,
          first_name: customerName?.trim().split(' ')[0] || 'Customer',
          last_name: customerName?.trim().split(' ').slice(1).join(' ') || 'User',
          email: customerEmail || 'customer@example.com',
          phone: customerPhone || '0771234567',
          address: 'No 1, Main Street',
          city: 'Colombo',
          country: 'Sri Lanka',
        };

        console.log('✅ Payment params generated:', { orderId, realOrderId });

        res.json({
          success: true,
          payhereUrl: process.env.PAYHERE_SANDBOX_URL,
          params: params,
        });

      } catch (error) {
        console.error('❌ Payment creation error:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post('/payment-notify', async (req, res) => {
      try {
        const { order_id, status_code, transaction_id, payhere_amount, payment_method } = req.body;
        console.log('📢 PayHere Notify:', req.body);

        if (status_code === '2') {
          const order = await OrdersCollection.findOne({ merchantOrderId: order_id });
          if (order) {
            await OrdersCollection.updateOne(
              { _id: order._id },
              { $set: { 
                status: 'Paid', 
                transactionId: transaction_id,
                paymentMethod: payment_method,
                paidAt: new Date().toISOString()
              }}
            );
            console.log(`✅ Order paid via notify: ${order._id}`);
          }
        }
        res.status(200).send('OK');
      } catch (error) {
        res.status(500).send('Error');
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");

  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
})
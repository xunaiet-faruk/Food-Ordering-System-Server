const express = require('express');
const app = express()
const port = 3000
const cors = require('cors');
const dns = require('dns');
require('dotenv').config()

app.use(cors());
app.use(express.json());

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

    // ========== USER ROUTES ==========
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

    // ========== FOOD ROUTES ==========
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

    // ========== CART ROUTES ==========
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

    // Get the updated cart to check if it's empty
    const updatedCart = await CartCollection.findOne({ email });
    const itemsCount = updatedCart?.items?.length || 0;

    // If cart is empty, delete it
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

    // ========== ORDER ROUTES ==========

    
   app.post('/orders', async (req, res) => {
  console.log("POST /orders HIT");

  try {
    const orderData = req.body;

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
        
        // Find the order first
        const order = await OrdersCollection.findOne({ _id: new ObjectId(orderId) });
        
        if (!order) {
          return res.status(404).json({ 
            success: false, 
            message: "Order not found" 
          });
        }
        
        // Remove the item
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
        
        // Update the order
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
        
        // If no items left, delete the order
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

    // ========== TEST ROUTE ==========
    app.get('/test-orders', async (req, res) => {
      try {
        // Check if orders collection exists
        const collections = await client.db('food-ordering').listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        res.json({
          collections: collectionNames,
          hasOrders: collectionNames.includes('orders'),
          message: collectionNames.includes('orders') ? 'Orders collection exists' : 'Orders collection does not exist'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");
    console.log("📊 Available collections:", await client.db('food-ordering').listCollections().toArray());

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
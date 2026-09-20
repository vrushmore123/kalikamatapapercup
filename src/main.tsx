import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import "./styles.css";
import { contactPlaceholder, faqItems, siteConfig } from "./config";
import { createOrder, getProducts, loginAdmin } from "./api";

type Product = {
  id: string;
  size: string;
  name: string;
  description: string;
  price: number | null;
  image: string;
  accent: string;
  packings: number[];
  availability: boolean;
};
type CartLine = { productId: string; packing: number; packs: number };
type Order = {
  id: string;
  createdAt: string;
  status: string;
  customer: Record<string, string>;
  lines: CartLine[];
  notes: string;
};

const initialProducts: Product[] = [
  {
    id: "55",
    size: "55 ml",
    name: "Paper Cup",
    description:
      "A compact paper cup for tea, tasting portions and everyday serving requirements.",
    price: null,
    image: "/images/55ml.png",
    accent: "#f6c967",
    packings: [],
    availability: true,
  },
  {
    id: "65",
    size: "65 ml",
    name: "Paper Cup",
    description:
      "A versatile paper cup for tea, coffee and everyday serving requirements.",
    price: null,
    image: "/images/65ml.png",
    accent: "#db8762",
    packings: [],
    availability: true,
  },
  {
    id: "85",
    size: "85 ml",
    name: "Paper Cup",
    description:
      "A larger paper cup for beverages, events and serving requirements.",
    price: null,
    image: "cup-85",
    accent: "#8eb9a7",
    packings: [],
    availability: true,
  },
];
const navItems = ["Home", "Products", "About us", "Gallery", "FAQ", "Contact"];

function productImageForCapacity(capacityMl: string | number, fallback = "") {
  const capacity = String(capacityMl);
  return ["55", "65", "85"].includes(capacity)
    ? `/images/${capacity}ml.png`
    : fallback;
}

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}
const savedProducts = load<Product[]>("kk-products-v2", initialProducts);
function App() {
  const [products, setProducts] = useState<Product[]>(() =>
    savedProducts.length ? savedProducts : initialProducts,
  );
  const [orders, setOrders] = useState<Order[]>(() => load("kk-orders", []));
  const [page, setPage] = useState(() =>
    window.location.pathname === "/admin/dashboard" ? "Admin" : "Home",
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("kk-products-v2", JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    getProducts()
      .then((remoteProducts) => {
        if (remoteProducts.length) {
          setProducts(
            remoteProducts.map((product) => ({
              id: String(product.capacityMl),
              size: `${product.capacityMl} ml`,
              name: product.name.replace(/^\d+\s*ml\s*/i, "") || "Paper Cup",
              description: product.description,
              price: product.price ?? null,
              image: productImageForCapacity(
                product.capacityMl,
                `cup-${product.capacityMl}`,
              ),
              accent: "#db8762",
              packings: product.packingOptions || [],
              availability: product.availability !== "unavailable",
            })),
          );
        }
      })
      .catch(() => {
        // Local seed data keeps the catalogue usable while the API is offline.
      });
  }, []);
  useEffect(() => {
    localStorage.setItem("kk-orders", JSON.stringify(orders));
  }, [orders]);
  const cartCount = cart.reduce((sum, line) => sum + line.packs, 0);
  const cartQuantity = cart.reduce(
    (sum, line) => sum + line.packing * line.packs,
    0,
  );
  const cartValue = cart.reduce(
    (sum, line) =>
      sum +
      (products.find((p) => p.id === line.productId)?.price || 0) * line.packs,
    0,
  );
  const go = (next: string) => {
    setPage(next);
    window.history.pushState(
      {},
      "",
      next === "Admin" ? "/admin/dashboard" : "/",
    );
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const addToCart = (product: Product, packing = product.packings[0] || 0) => {
    setCart((current) => {
      const found = current.find(
        (line) => line.productId === product.id && line.packing === packing,
      );
      return found
        ? current.map((line) =>
            line === found ? { ...line, packs: line.packs + 1 } : line,
          )
        : [...current, { productId: product.id, packing, packs: 1 }];
    });
    setNotice(`${product.size} added to your order`);
    setTimeout(() => setNotice(""), 2600);
  };
  const updateLine = (index: number, delta: number) =>
    setCart((current) =>
      current.map((line, i) =>
        i === index
          ? { ...line, packs: Math.max(1, line.packs + delta) }
          : line,
      ),
    );
  const submitOrder = async (order: Order) => {
    try {
      const saved = await createOrder({
        customer: {
          name: order.customer.name,
          mobile: order.customer.mobile,
          email: order.customer.email || "",
          company: order.customer.company || "",
          address: order.customer.address,
          city: order.customer.city,
          state: order.customer.state,
          pincode: order.customer.pincode,
        },
        items: order.lines.map((line) => ({
          productId: line.productId,
          quantity: Number(order.customer.quantity),
          packs: line.packs,
          packingRequirement: order.customer.packingRequirement,
        })),
        preferredDeliveryDate: order.customer.deliveryDate || "",
        paymentPreference: order.customer.paymentPreference || "",
        notes: order.notes,
        termsAccepted: true,
      });
      order = { ...order, id: saved.orderNumber, status: saved.status };
    } catch {
      setNotice("API unavailable; request saved locally");
      setTimeout(() => setNotice(""), 3000);
    }
    setOrders((current) => [order, ...current]);
    setConfirmation(order);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="container nav-wrap">
          <button className="brand" onClick={() => go("Home")}>
            <span className="brand-mark">
              <Leaf size={20} />
            </span>
            <span>
              Kalikamata<small>Paper Cup Products</small>
            </span>
          </button>
          <nav className={mobileMenu ? "nav mobile-open" : "nav"}>
            {navItems.map((item) => (
              <button
                className={page === item ? "active" : ""}
                key={item}
                onClick={() => go(item)}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className="cart-button"
              aria-label="Open order"
              onClick={() => setShowCart(true)}
            >
              <ShoppingBag size={19} />
              <span>{cartCount}</span>
            </button>
            <button
              className="menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>
      {notice && (
        <div className="toast">
          <Check size={16} /> {notice}
        </div>
      )}
      {confirmation ? (
        <Confirmation
          order={confirmation}
          products={products}
          onBack={() => {
            setConfirmation(null);
            go("Home");
          }}
        />
      ) : page === "Admin" ? (
        <Admin
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          onExit={() => go("Home")}
        />
      ) : (
        <main>
          {page === "Home" && (
            <Home
              go={go}
              products={products}
              addToCart={addToCart}
              setDetail={setDetail}
            />
          )}
          {page === "Products" && (
            <Products
              products={products}
              addToCart={addToCart}
              setDetail={setDetail}
            />
          )}
          {page === "About us" && <About go={go} />}
          {page === "Gallery" && <Gallery />}
          {page === "FAQ" && <FAQ />}
          {page === "Contact" && <Contact />}
          {page === "Place order" && (
            <OrderPage
              cart={cart}
              products={products}
              quantity={cartQuantity}
              value={cartValue}
              setCart={setCart}
              onSubmit={submitOrder}
            />
          )}
        </main>
      )}
      {showCart && (
        <CartDrawer
          cart={cart}
          products={products}
          quantity={cartQuantity}
          value={cartValue}
          updateLine={updateLine}
          removeLine={(i) => setCart(cart.filter((_, index) => index !== i))}
          close={() => setShowCart(false)}
          checkout={() => {
            setShowCart(false);
            go("Place order");
          }}
        />
      )}
      {detail && (
        <ProductModal
          product={detail}
          addToCart={addToCart}
          close={() => setDetail(null)}
        />
      )}
      <footer>
        <div className="container footer-grid">
          <div>
            <button className="brand footer-brand" onClick={() => go("Home")}>
              <span className="brand-mark">
                <Leaf size={20} />
              </span>
              <span>
                Kalikamata<small>Paper Cup Products</small>
              </span>
            </button>
            <p>
              {siteConfig.businessName}
              <br />
              Owned by {siteConfig.ownerName}
            </p>
          </div>
          <div>
            <b>Explore</b>
            <button onClick={() => go("Products")}>Products</button>
            <button onClick={() => go("About us")}>Our story</button>
            <button onClick={() => go("Contact")}>Contact</button>
          </div>
          <div>
            <b>Reach us</b>
            <span>
              <Phone size={14} /> {siteConfig.phone || contactPlaceholder}
            </span>
            <span>
              <Mail size={14} /> {siteConfig.email || contactPlaceholder}
            </span>
            <span>
              <MapPin size={14} /> {siteConfig.address || contactPlaceholder}
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          © 2026 Kalikamata Paper Cup Products{" "}
          <span>Made for better serving</span>
        </div>
      </footer>
    </div>
  );
}

function Home({
  go,
  products,
  addToCart,
  setDetail,
}: {
  go: (p: string) => void;
  products: Product[];
  addToCart: (p: Product) => void;
  setDetail: (p: Product) => void;
}) {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> Paper cup catalogue
            </div>
            <h1>
              Quality cups for
              <br />
              <em>everyday business.</em>
            </h1>
            <p>
              Explore 55 ml, 65 ml and 85 ml paper cup options from Kalikamata
              Paper Products, owned by Savita More.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => go("Products")}>
                View products <ArrowRight size={17} />
              </button>
              <button className="text-button" onClick={() => go("Place order")}>
                Book an order <ArrowRight size={15} />
              </button>
            </div>
            <div className="hero-proof">
              <span>
                <BadgeCheck size={18} /> Multiple sizes
              </span>
              <span>
                <ClipboardList size={18} /> Structured requests
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="sun" />
            <div className="hero-cup cup-hero">
              {/* <div className="cup-rim" /> */}
              <img src="/images/hero-image.png" alt="Hero Cup" />
            </div>
            <div className="hero-note">
              <span className="dot" /> Owner: Savita More
            </div>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div className="container trust-items">
          <div>
            <span className="trust-icon">
              <Box />
            </span>
            <span>
              <b>Three cup sizes</b>
              <small>55 ml, 65 ml and 85 ml</small>
            </span>
          </div>
          <div>
            <span className="trust-icon">
              <ClipboardList />
            </span>
            <span>
              <b>Clear requirements</b>
              <small>Quantity and packing fields</small>
            </span>
          </div>
          <div>
            <span className="trust-icon">
              <Sparkles />
            </span>
            <span>
              <b>Quote-ready</b>
              <small>Commercial terms configurable</small>
            </span>
          </div>
          <div>
            <span className="trust-icon">
              <Truck />
            </span>
            <span>
              <b>Delivery details</b>
              <small>Confirmed per request</small>
            </span>
          </div>
        </div>
      </section>
      <section className="section featured container">
        <div className="section-head">
          <div>
            <div className="eyebrow">The essentials</div>
            <h2>Find your everyday cup</h2>
          </div>
          <button className="text-button" onClick={() => go("Products")}>
            View all sizes <ArrowRight size={15} />
          </button>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              addToCart={addToCart}
              setDetail={setDetail}
            />
          ))}
        </div>
      </section>
      <section className="story-band">
        <div className="container story-layout">
          <div className="story-image">
            {/* <div className="leaf-pattern">✦</div> */}
            <div className="story-cup">
              <img src="/images/hero-2.png" alt="Story Cup" />
            </div>
          </div>
          <div className="story-copy">
            <div className="eyebrow">A little more thought</div>
            <h2>
              Simple ordering.
              <br />
              Clear requirements.
            </h2>
            <p>
              Share your cup size, quantity, packing preference and delivery
              details in one structured request. The business can then confirm
              availability, pricing and terms.
            </p>
            <button className="button outline" onClick={() => go("About us")}>
              About the business <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <section className="cta container">
        <div>
          <div className="eyebrow light">Have a requirement?</div>
          <h2>
            Need paper cups
            <br />
            in bulk?
          </h2>
        </div>
        <button className="button cream" onClick={() => go("Place order")}>
          Book an order <ArrowRight size={17} />
        </button>
      </section>
    </>
  );
}

function ProductCard({
  product,
  addToCart,
  setDetail,
}: {
  product: Product;
  addToCart: (p: Product) => void;
  setDetail: (p: Product) => void;
}) {
  const productImage = productImageForCapacity(product.id, product.image);

  return (
    <article className="product-card">
      <button
        className="product-image-button"
        onClick={() => setDetail(product)}
      >
        {productImage.startsWith("/") || productImage.startsWith("http") ? (
          <img
            src={productImage}
            alt={product.name}
            className="product-image"
          />
        ) : (
          <div className="cup-shape">
            <div className="cup-rim" />
            <span>KK</span>
          </div>
        )}

        <span className="product-view-label">
          View details
        </span>
      </button>
      <div className="product-info">
        <div>
          <span className="size-label">{product.size}</span>
          <h3>{product.name}</h3>
        </div>
        <span className="price">Get Quote</span>
      </div>
      <p>{product.description}</p>
      <div className="card-bottom">
        <span className="packing">
          <Box size={14} /> Packing configured on request
        </span>
        <button
          className="icon-button"
          aria-label={`Add ${product.size}`}
          onClick={() => addToCart(product)}
        >
          <Plus size={18} />
        </button>
      </div>
    </article>
  );
}

function Products({
  products,
  addToCart,
  setDetail,
}: {
  products: Product[];
  addToCart: (p: Product) => void;
  setDetail: (p: Product) => void;
}) {
  return (
    <section className="page-section container">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Our catalogue</div>
          <h1>
            Paper cups for
            <br />
            <em>every occasion.</em>
          </h1>
        </div>
        <p>
          Choose a size and submit your requirement. Packing, quantity and
          pricing are confirmed by the business for each request.
        </p>
      </div>
      <div className="compare-note">
        <ClipboardList size={18} />
        <span>
          <b>Request a quote</b> Packing options, minimum quantities and pricing
          are configured by the business.
        </span>
      </div>
      <div className="product-grid large">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            addToCart={addToCart}
            setDetail={setDetail}
          />
        ))}
      </div>
    </section>
  );
}

function About({ go }: { go: (p: string) => void }) {
  return (
    <section className="page-section container about">
      <div className="page-intro">
        <div>
          <div className="eyebrow">About the business</div>
          <h1>
            Kalikamata
            <br />
            <em>Paper Products.</em>
          </h1>
        </div>
        <p>
          A paper cup manufacturing and supply business owned by Savita More.
          This page is ready for the owner to add the company story and
          operating details.
        </p>
      </div>
      <div className="about-grid">
        <div className="about-stat">
          <img src="/images/hero-image.png" alt="Owner" />
        </div>
        <div>
          <h2>
            Practical products.
            <br />
            Clear communication.
          </h2>
          <p>
            Kalikamata Paper Products serves customers looking for 55 ml, 65 ml
            and 85 ml paper cups. Product availability, packing, minimum
            quantities, pricing and delivery are confirmed for each request.
          </p>
          <p>
            Use the structured order form to share a complete requirement, or
            contact the business with a general enquiry.
          </p>
          <button className="button primary" onClick={() => go("Contact")}>
            Contact the business <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="values">
        <div>
          <Leaf />
          <h3>Product choice</h3>
          <p>
            Three initial cup sizes with room to add more through the admin
            catalogue.
          </p>
        </div>
        <div>
          <ShieldCheck />
          <h3>Clear requirements</h3>
          <p>
            Structured requests capture quantity, packing and delivery details.
          </p>
        </div>
        <div>
          <Truck />
          <h3>Business support</h3>
          <p>
            Availability and commercial terms are confirmed before an order is
            accepted.
          </p>
        </div>
      </div>
    </section>
  );
}

type MasonryItem = {
  id: string;
  img: string;
  height: number;
  title: string;
};

const galleryItems: MasonryItem[] = [
  { id: "hero", img: "/images/hero-image.png", height: 520, title: "Featured collection" },
  { id: "55", img: "/images/55ml.png", height: 330, title: "55 ml paper cup" },
  { id: "story", img: "/images/hero-2.png", height: 420, title: "Made for everyday serving" },
  { id: "65", img: "/images/65ml.png", height: 300, title: "65 ml paper cup" },
  { id: "85", img: "/images/85ml.png", height: 390, title: "85 ml paper cup" },
];

function MasonryGallery({ items }: { items: MasonryItem[] }) {
  return (
    <div className="masonry-gallery" aria-label="Product gallery">
      {items.map((item) => (
        <figure
          className="masonry-item"
          key={item.id}
          style={{ aspectRatio: `1 / ${item.height / 400}` }}
        >
          <img src={item.img} alt={item.title} />
          <figcaption>{item.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Gallery() {
  return (
    <section className="page-section container gallery">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Gallery</div>
          <h1>
            A closer look at
            <br />
            <em>our products.</em>
          </h1>
        </div>
        <p>
          Product and business imagery can be added here when approved
          photographs are available.
        </p>
      </div>
      <MasonryGallery items={galleryItems} />
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="page-section container faq">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Questions, answered</div>
          <h1>
            What would you
            <br />
            <em>like to know?</em>
          </h1>
        </div>
        <p>
          Answers are based on the information currently configured for
          Kalikamata Paper Products.
        </p>
      </div>
      <div className="faq-list">
        {faqItems.map((item, index) => (
          <div
            className={open === index ? "faq-item open" : "faq-item"}
            key={item.question}
          >
            <button onClick={() => setOpen(open === index ? -1 : index)}>
              <span>{item.question}</span>
              <ChevronDown size={18} />
            </button>
            {open === index && <p>{item.answer}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const configured = Boolean(
    siteConfig.phone || siteConfig.email || siteConfig.address,
  );
  return (
    <section className="page-section container contact">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Get in touch</div>
          <h1>
            Let’s talk
            <br />
            <em>paper cups.</em>
          </h1>
        </div>
        <p>
          Share your requirement with the business owner and request a quotation
          or more information.
        </p>
      </div>
      <div className="contact-grid">
        <div className="contact-details">
          <div>
            <span>
              <UserRound />
            </span>
            <b>Owner</b>
            <p>{siteConfig.ownerName}</p>
          </div>
          <div>
            <span>
              <Phone />
            </span>
            <b>Phone</b>
            <p>{siteConfig.phone || contactPlaceholder}</p>
          </div>
          <div>
            <span>
              <Mail />
            </span>
            <b>Email</b>
            <p>{siteConfig.email || contactPlaceholder}</p>
          </div>
          <div>
            <span>
              <MapPin />
            </span>
            <b>Address</b>
            <p>{siteConfig.address || contactPlaceholder}</p>
          </div>
          {!configured && (
            <div className="config-note">
              Contact details are ready to configure in{" "}
              <strong>src/config.ts</strong>.
            </div>
          )}
        </div>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <h2>Send an enquiry</h2>
          {sent ? (
            <div className="sent">
              <Check size={28} />
              <h3>Enquiry submitted.</h3>
              <p>
                Your structured enquiry is ready for the business to review.
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => setSent(false)}
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <div className="form-row">
                <label>
                  Name
                  <input required placeholder="Your name" />
                </label>
                <label>
                  Mobile
                  <input
                    required
                    pattern="[0-9+ ]{10,}"
                    placeholder="Your mobile number"
                  />
                </label>
              </div>
              <label>
                Email <small>(optional)</small>
                <input type="email" placeholder="you@company.com" />
              </label>
              <label>
                Subject
                <input required placeholder="What do you need?" />
              </label>
              <label>
                Message
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your requirement..."
                />
              </label>
              <button className="button primary" type="submit">
                Send enquiry <ArrowRight size={16} />
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function CartDrawer({
  cart,
  products,
  quantity,
  value,
  updateLine,
  removeLine,
  close,
  checkout,
}: {
  cart: CartLine[];
  products: Product[];
  quantity: number;
  value: number;
  updateLine: (i: number, d: number) => void;
  removeLine: (i: number) => void;
  close: () => void;
  checkout: () => void;
}) {
  return (
    <div className="overlay">
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">Your selection</span>
            <h2>Order list</h2>
          </div>
          <button className="close" onClick={close}>
            <X />
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="empty">
            <ShoppingBag size={36} />
            <h3>Your order is empty</h3>
            <p>Add a size from the catalogue to get started.</p>
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {cart.map((line, i) => {
                const p = products.find(
                  (product) => product.id === line.productId,
                )!;
                return (
                  <div
                    className="drawer-line"
                    key={`${line.productId}-${line.packing}`}
                  >
                    <div className={`mini-cup ${p.image}`}>
                      <div className="cup-shape">
                        <div className="cup-rim" />
                      </div>
                    </div>
                    <div className="line-info">
                      <b>
                        {p.size} <small>{p.name}</small>
                      </b>
                      <span>
                        {line.packing
                          ? `${line.packing} cups / pack`
                          : "Packing to be confirmed"}
                      </span>
                      <div className="stepper">
                        <button onClick={() => updateLine(i, -1)}>
                          <Minus size={13} />
                        </button>
                        <b>{line.packs}</b>
                        <button onClick={() => updateLine(i, 1)}>
                          <Plus size={13} />
                        </button>
                        <button
                          className="remove"
                          onClick={() => removeLine(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <strong>
                      {p.price ? `₹${p.price * line.packs}` : "Get Quote"}
                    </strong>
                  </div>
                );
              })}
            </div>
            <div className="drawer-total">
              <div>
                <span>Total cups</span>
                <b>
                  {quantity
                    ? quantity.toLocaleString("en-IN")
                    : "To be confirmed"}
                </b>
              </div>
              <div>
                <span>Estimated value</span>
                <b>
                  {value ? `₹${value.toLocaleString("en-IN")}` : "Get Quote"}
                </b>
              </div>
              <small>
                Final pricing confirmed by our team after reviewing your
                requirement.
              </small>
              <button className="button primary full" onClick={checkout}>
                Continue to details <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function OrderPage({
  cart,
  products,
  quantity,
  value,
  setCart,
  onSubmit,
}: {
  cart: CartLine[];
  products: Product[];
  quantity: number;
  value: number;
  setCart: (c: CartLine[]) => void;
  onSubmit: (o: Order) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const update = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: `KK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: "New",
      customer: form,
      lines: cart,
      notes: form.notes || "",
    });
  };
  return (
    <section className="order-page container">
      <div className="order-title">
        <button className="back-link" onClick={() => window.history.back()}>
          ← Back to catalogue
        </button>
        <div className="eyebrow">Almost there</div>
        <h1>
          Complete your
          <br />
          <em>order details.</em>
        </h1>
      </div>
      <div className="order-layout">
        <form className="order-form" onSubmit={submit}>
          <div className="form-section">
            <h2>
              <span>01</span> Your details
            </h2>
            <div className="form-row">
              <label>
                Customer name
                <input
                  required
                  value={form.name || ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Full name"
                />
              </label>
              <label>
                Mobile number
                <input
                  required
                  value={form.mobile || ""}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="Your mobile number"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email address
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@company.com"
                />
              </label>
              <label>
                Company / business <small>(optional)</small>
                <input
                  value={form.company || ""}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Business name"
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <h2>
              <span>02</span> Delivery address
            </h2>
            <label>
              Address
              <input
                required
                value={form.address || ""}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Street, area, building"
              />
            </label>
            <div className="form-row three">
              <label>
                City
                <input
                  required
                  value={form.city || ""}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="City or area"
                />
              </label>
              <label>
                State
                <input
                  required
                  value={form.state || ""}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="State"
                />
              </label>
              <label>
                Pincode
                <input
                  required
                  pattern="[0-9]{6}"
                  value={form.pincode || ""}
                  onChange={(e) => update("pincode", e.target.value)}
                  placeholder="Pincode"
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <h2>
              <span>03</span> Product requirement
            </h2>
            <div className="form-row">
              <label>
                Quantity required
                <input
                  required
                  type="number"
                  min="1"
                  value={form.quantity || ""}
                  onChange={(e) => update("quantity", e.target.value)}
                  placeholder="Total cups required"
                />
              </label>
              <label>
                Packing requirement
                <select
                  required
                  value={form.packingRequirement || ""}
                  onChange={(e) => update("packingRequirement", e.target.value)}
                >
                  <option value="">Select packing</option>
                  <option>Standard packing</option>
                  <option>Bulk packing</option>
                  <option>Custom packing</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <label>
              Custom packing instructions <small>(optional)</small>
              <input
                value={form.packingInstructions || ""}
                onChange={(e) => update("packingInstructions", e.target.value)}
                placeholder="Describe any packing preference"
              />
            </label>
            <div className="form-row">
              <label>
                Preferred delivery date <small>(optional)</small>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={form.deliveryDate || ""}
                  onChange={(e) => update("deliveryDate", e.target.value)}
                />
              </label>
              <label>
                Payment preference <small>(optional)</small>
                <input
                  value={form.paymentPreference || ""}
                  onChange={(e) => update("paymentPreference", e.target.value)}
                  placeholder="Your preference"
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <h2>
              <span>04</span> Additional requirements <small>(optional)</small>
            </h2>
            <textarea
              rows={4}
              value={form.notes || ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Delivery timelines, printing, or anything else we should know..."
            />
          </div>
          <label className="consent">
            <input type="checkbox" required /> I agree to share these details
            for order review.
          </label>
          <button
            className="button primary submit-order"
            disabled={!cart.length}
          >
            Submit order request <ArrowRight size={17} />
          </button>
        </form>
        <aside className="order-summary">
          <div className="summary-top">
            <span className="eyebrow">Review</span>
            <h2>Your order</h2>
          </div>
          {cart.length === 0 ? (
            <p>No products added yet.</p>
          ) : (
            cart.map((line) => {
              const p = products.find((x) => x.id === line.productId)!;
              return (
                <div
                  className="summary-line"
                  key={`${line.productId}-${line.packing}`}
                >
                  <div>
                    <b>{p.size} Paper Cup</b>
                    <span>
                      {line.packing
                        ? `${line.packing} cups`
                        : "Packing to be confirmed"}{" "}
                      × {line.packs} packs
                    </span>
                  </div>
                  <strong>
                    {line.packing
                      ? (line.packing * line.packs).toLocaleString("en-IN")
                      : "Quote"}
                  </strong>
                </div>
              );
            })
          )}
          <div className="calculation">
            <span>
              <PackageCheck size={16} /> Total quantity
            </span>
            <strong>
              {form.quantity
                ? `${Number(form.quantity).toLocaleString("en-IN")} cups`
                : "To be confirmed"}
            </strong>
            <small>
              {form.quantity
                ? "Customer requested quantity"
                : "Quantity and pack size confirmed after review"}
            </small>
          </div>
          <div className="summary-value">
            <span>Estimated order value</span>
            <b>{value ? `₹${value.toLocaleString("en-IN")}` : "Get Quote"}</b>
          </div>
          <button className="text-button" onClick={() => setCart([])}>
            Clear order
          </button>
        </aside>
      </div>
    </section>
  );
}

function Confirmation({
  order,
  products,
  onBack,
}: {
  order: Order;
  products: Product[];
  onBack: () => void;
}) {
  const total = order.lines.reduce(
    (s, line) => s + line.packing * line.packs,
    0,
  );
  return (
    <section className="confirmation container">
      <div className="success-mark">
        <Check size={30} />
      </div>
      <div className="eyebrow">Order received</div>
      <h1>Thank you, {order.customer.name?.split(" ")[0] || "there"}.</h1>
      <p className="confirm-lead">
        Your order request is with our team. We’ll call you shortly to confirm
        pricing and delivery.
      </p>
      <div className="order-id">
        <span>Order ID</span>
        <strong>{order.id}</strong>
        <span className="status-pill">New</span>
      </div>
      <div className="confirm-grid">
        <div className="confirm-card">
          <h2>Order details</h2>
          {order.lines.map((line) => {
            const p = products.find((x) => x.id === line.productId)!;
            return (
              <div className="confirm-line" key={line.productId}>
                <span>
                  <b>{p.size} Paper Cup</b>
                  <small>
                    {line.packing} cups / pack · {line.packs} packs
                  </small>
                </span>
                <strong>
                  {(line.packing * line.packs).toLocaleString("en-IN")} cups
                </strong>
              </div>
            );
          })}
          <div className="confirm-total">
            <span>Total quantity</span>
            <b>{total.toLocaleString("en-IN")} cups</b>
          </div>
        </div>
        <div className="confirm-card customer-card">
          <h2>Delivery to</h2>
          <b>{order.customer.name}</b>
          <p>
            {order.customer.address}
            <br />
            {order.customer.city}, {order.customer.state} -{" "}
            {order.customer.pincode}
          </p>
          <span>
            <Phone size={14} /> {order.customer.mobile}
          </span>
          <span>
            <Mail size={14} /> {order.customer.email}
          </span>
        </div>
      </div>
      <button className="button primary" onClick={onBack}>
        Back to home <ArrowRight size={16} />
      </button>
    </section>
  );
}

function ProductModal({
  product,
  addToCart,
  close,
}: {
  product: Product;
  addToCart: (p: Product, packing?: number) => void;
  close: () => void;
}) {
  const productImage = productImageForCapacity(product.id, product.image);

  return (
    <div className="overlay">
      <div className="modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <div className={`modal-art ${productImage}`}>
          {productImage.startsWith("/") || productImage.startsWith("http") ? (
            <img src={productImage} alt={product.name} />
          ) : (
            <div className="cup-shape">
              <div className="cup-rim" />
              <span>KK</span>
            </div>
          )}
        </div>
        <div className="modal-copy">
          <span className="size-label">{product.size}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <div className="option-label">Packing</div>
          <div className="packing-options">
            <span className="packing-unconfigured">
              Packing options configured on request
            </span>
          </div>
          <div className="modal-price">
            <span>
              <b>Get Quote</b>
            </span>
            <button
              className="button primary"
              onClick={() => {
                addToCart(product);
                close();
              }}
            >
              Add to order <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Admin({
  products,
  setProducts,
  orders,
  setOrders,
  onExit,
}: {
  products: Product[];
  setProducts: (p: Product[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  onExit: () => void;
}) {
  const [logged, setLogged] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("Orders");
  const [search, setSearch] = useState("");
  if (!logged)
    return (
      <section className="admin-login">
        <div className="login-box">
          <span className="brand-mark">
            <ShieldCheck size={21} />
          </span>
          <div className="eyebrow">Kalikamata workspace</div>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your catalogue and customer orders.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError("");
              const form = new FormData(e.currentTarget);
              try {
                await loginAdmin(
                  String(form.get("email") || ""),
                  String(form.get("password") || ""),
                );
                setLogged(true);
              } catch (error) {
                setLoginError(
                  error instanceof Error ? error.message : "Sign in failed",
                );
              }
            }}
          >
            <label>
              Email
              <input type="email" required name="email" />
            </label>
            <label>
              Password
              <input type="password" required name="password" />
            </label>
            {loginError && <p className="form-error">{loginError}</p>}
            <button className="button primary full">
              Sign in <ArrowRight size={16} />
            </button>
          </form>
          <button className="back-link" onClick={onExit}>
            ← Return to website
          </button>
        </div>
      </section>
    );
  const filtered = orders.filter((o) =>
    `${o.id} ${o.customer.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <button className="brand" onClick={onExit}>
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>
            Kalikamata<small>Admin workspace</small>
          </span>
        </button>
        <div className="admin-nav">
          <button
            className={tab === "Orders" ? "active" : ""}
            onClick={() => setTab("Orders")}
          >
            <ClipboardList size={17} /> Orders <b>{orders.length}</b>
          </button>
          <button
            className={tab === "Products" ? "active" : ""}
            onClick={() => setTab("Products")}
          >
            <Box size={17} /> Products
          </button>
        </div>
        <button className="back-link" onClick={onExit}>
          ← View website
        </button>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h1>
              {tab === "Orders" ? "Orders overview" : "Product catalogue"}
            </h1>
          </div>
          <span className="admin-user">
            <UserRound size={16} /> Administrator
          </span>
        </div>
        {tab === "Orders" ? (
          <>
            <div className="metrics">
              <div>
                <span>All orders</span>
                <strong>{orders.length}</strong>
                <small>Lifetime requests</small>
              </div>
              <div>
                <span>New</span>
                <strong>
                  {orders.filter((o) => o.status === "New").length}
                </strong>
                <small>Need attention</small>
              </div>
              <div>
                <span>In progress</span>
                <strong>
                  {
                    orders.filter((o) =>
                      ["Confirmed", "Processing"].includes(o.status),
                    ).length
                  }
                </strong>
                <small>Being prepared</small>
              </div>
              <div>
                <span>Completed</span>
                <strong>
                  {orders.filter((o) => o.status === "Delivered").length}
                </strong>
                <small>Successfully delivered</small>
              </div>
            </div>
            <div className="admin-table-wrap">
              <div className="table-toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order or customer"
                  />
                </div>
                <select>
                  <option>All statuses</option>
                  <option>New</option>
                  <option>Confirmed</option>
                  <option>Processing</option>
                  <option>Dispatched</option>
                  <option>Delivered</option>
                </select>
              </div>
              {filtered.length === 0 ? (
                <div className="empty admin-empty">
                  <ClipboardList size={28} />
                  <b>No orders yet</b>
                  <span>Customer orders will appear here.</span>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Placed</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <b>{order.id}</b>
                        </td>
                        <td>
                          <b>{order.customer.name}</b>
                          <small>{order.customer.city}</small>
                        </td>
                        <td>
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </td>
                        <td>
                          {order.lines
                            .reduce((s, l) => s + l.packing * l.packs, 0)
                            .toLocaleString("en-IN")}{" "}
                          cups
                        </td>
                        <td>
                          <span
                            className={`status ${order.status.toLowerCase()}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              setOrders(
                                orders.map((o) =>
                                  o.id === order.id
                                    ? { ...o, status: e.target.value }
                                    : o,
                                ),
                              )
                            }
                          >
                            <option>New</option>
                            <option>Confirmed</option>
                            <option>Processing</option>
                            <option>Dispatched</option>
                            <option>Delivered</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <ProductAdmin products={products} setProducts={setProducts} />
        )}
      </div>
    </section>
  );
}

function ProductAdmin({
  products,
  setProducts,
}: {
  products: Product[];
  setProducts: (p: Product[]) => void;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const blank: Product = {
    id: "",
    size: "",
    name: "",
    description: "",
    price: null,
    image: "cup-65",
    accent: "#db8762",
    packings: [],
    availability: true,
  };
  return (
    <div className="product-admin">
      <div className="admin-panel-head">
        <p>Manage sizes, pricing and packing options shown to customers.</p>
        <button className="button primary" onClick={() => setEditing(blank)}>
          Add product <Plus size={16} />
        </button>
      </div>
      <div className="admin-products">
        {products.map((p) => (
          <div className="admin-product" key={p.id}>
            <div className={`mini-cup ${p.image}`}>
              <div className="cup-shape">
                <div className="cup-rim" />
              </div>
            </div>
            <div>
              <b>
                {p.size} · {p.name}
              </b>
              <span>
                {p.price ? `₹${p.price} / pack` : "Get Quote"} ·{" "}
                {p.packings.length
                  ? p.packings.join(" / ")
                  : "Packing to configure"}
              </span>
            </div>
            <button className="text-button" onClick={() => setEditing(p)}>
              Edit
            </button>
            <button
              className="delete-button"
              onClick={() => setProducts(products.filter((x) => x.id !== p.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="overlay">
          <form
            className="modal edit-modal"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const item = {
                ...editing,
                id: String(data.get("id")),
                size: String(data.get("size")),
                name: String(data.get("name")),
                price: String(data.get("price")).trim()
                  ? Number(data.get("price"))
                  : null,
                description: String(data.get("description")),
                packings: String(data.get("packings")).trim()
                  ? String(data.get("packings")).split(",").map(Number)
                  : [],
              };
              setProducts(
                products.some((p) => p.id === item.id)
                  ? products.map((p) => (p.id === item.id ? item : p))
                  : [...products, item],
              );
              setEditing(null);
            }}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <h2>{editing.id ? "Edit product" : "Add product"}</h2>
            <div className="form-row">
              <label>
                ID
                <input name="id" defaultValue={editing.id} required />
              </label>
              <label>
                Capacity
                <input name="size" defaultValue={editing.size} required />
              </label>
            </div>
            <div className="form-row">
              <label>
                Product name
                <input name="name" defaultValue={editing.name} required />
              </label>
              <label>
                Price per pack
                <input
                  name="price"
                  type="number"
                  defaultValue={editing.price ?? ""}
                />
              </label>
            </div>
            <label>
              Description
              <input
                name="description"
                defaultValue={editing.description}
                required
              />
            </label>
            <label>
              Packing sizes <small>optional, comma separated</small>
              <input
                name="packings"
                defaultValue={editing.packings.join(",")}
              />
            </label>
            <button className="button primary full">Save product</button>
          </form>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

export default App;

import type { ComponentType, CSSProperties } from "react";
import type { StaticImageData } from "next/image";
import answersDms from "@/images/Answers Dms.jpeg";
import collectPayments from "@/images/Collect Payments.jpeg";
import sellProduct from "@/images/Sell Product.jpeg";
import takeOrders from "@/images/Take Orders.jpeg";
import growBusiness from "@/images/Grow.jpeg";
import {
  Card3D,
  Chat3D,
  Growth3D,
  Package3D,
  ShoppingBag3D,
} from "./capability-icons";

export type CapabilityIconProps = {
  className?: string;
  style?: CSSProperties;
};

export type Capability = {
  words: string[];
  icon: ComponentType<CapabilityIconProps>;
  label: string;
  /**
   * Backdrop photo shown while this phrase is on screen. Phrases without one
   * ("grows your business") fall back to the plain landing gradient.
   */
  image?: StaticImageData;
};

export const CAPABILITIES: Capability[] = [
  {
    words: ["sells", "your", "products"],
    icon: ShoppingBag3D,
    label: "sells products",
    image: sellProduct,
  },
  {
    words: ["takes", "your", "orders"],
    icon: Package3D,
    label: "takes orders",
    image: takeOrders,
  },
  {
    words: ["answers", "your", "DMs"],
    icon: Chat3D,
    label: "answers DMs",
    image: answersDms,
  },
  {
    words: ["collects", "payments"],
    icon: Card3D,
    label: "collects payments",
    image: collectPayments,
  },
  {
    words: ["grows", "your", "business"],
    icon: Growth3D,
    label: "grows your business",
    image: growBusiness,
  },
];

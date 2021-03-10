
import { DOM, Observable } from "@microsoft/fast-element";
import { expect } from "chai";
import { FASTElement } from "../../../fast-element/dist/fast-element";
import { DesignSystem } from "../design-system";
import { FoundationElement } from "../foundation-element";
import { DesignToken } from "./design-token";

new DesignSystem().register(
    FoundationElement.compose({ type: class extends FoundationElement { }, baseName: "custom-element" })()
).applyTo(document.body)

function addElement(parent = document.body): FASTElement & HTMLElement {
    const el = document.createElement("fast-custom-element") as any;
    parent.appendChild(el);
    return el;
}

function removeElement(...els: HTMLElement[]) {
    els.forEach(el => {
        el.parentElement?.removeChild(el);
    })
}

describe("A DesignToken", () => {
    it("should have a createCSS() method that returns a string with the name property formatted as a CSS variable", () => {
        expect(DesignToken.create<number>("implicit").createCSS()).to.equal("var(--implicit)");
    });
    it("should have a readonly cssCustomProperty property that is the name formatted as a CSS custom property", () => {
        expect(DesignToken.create<number>("implicit").cssCustomProperty).to.equal("--implicit");
    });

    describe("getting and setting a simple value", () => {
        it("should throw if the token value has never been set on the element or it's any ancestors", () => {
            const target = addElement();
            const token = DesignToken.create<number>("test");

            expect(() => token.getValueFor(target)).to.throw();
            removeElement(target);
        });

        it("should return the value set for the element if one has been set", () => {
            const target = addElement();
            const token = DesignToken.create<number>("test");
            token.setValueFor(target, 12);

            expect(token.getValueFor(target)).to.equal(12);
            removeElement(target);
        });

        it("should return the value set for an ancestor if a value has not been set for the target", () => {
            const ancestor = addElement();
            const target = addElement(ancestor);
            const token = DesignToken.create<number>("test");
            token.setValueFor(ancestor, 12);

            expect(token.getValueFor(target)).to.equal(12);
            removeElement(ancestor);
        });

        it("sound return the nearest ancestor's value after an intermediary value is set where no value was set prior", async () => {
            const grandparent = addElement();
            const parent = addElement(grandparent);
            const target = addElement(parent);

            const token = DesignToken.create<number>("test");

            token.setValueFor(grandparent, 12);

            expect(token.getValueFor(target)).to.equal(12);

            token.setValueFor(parent, 14);

            await DOM.nextUpdate();

            expect(token.getValueFor(target)).to.equal(14);
        })
    });
    describe("getting and setting derived values", () => {
        it("should get the return value of a derived value", () => {
            const target = addElement();
            const token = DesignToken.create<number>("test");
            token.setValueFor(target, () => 12);

            expect(token.getValueFor(target)).to.equal(12);
            removeElement(target)
        });
        it("should get an updated value when observable properties used in a derived property are changed", async () => {
            const target = addElement();
            const token = DesignToken.create<number>("test");
            const dependencies: { value: number } = {} as { value: number }
            Observable.defineProperty(dependencies, "value");
            dependencies.value = 6

            token.setValueFor(target, () => dependencies.value * 2);

            expect(token.getValueFor(target)).to.equal(12);

            dependencies.value = 7;
            await DOM.nextUpdate();

            expect(token.getValueFor(target)).to.equal(14);
            removeElement(target)
        });
        it("should get an updated value when other design tokens used in a derived property are changed", async () => {
            const target = addElement();
            const tokenA = DesignToken.create<number>("A");
            const tokenB = DesignToken.create<number>("B");

            tokenA.setValueFor(target, 6);
            tokenB.setValueFor(target, (target: HTMLElement & FASTElement) => tokenA.getValueFor(target) * 2);

            expect(tokenB.getValueFor(target)).to.equal(12);

            tokenA.setValueFor(target, 7);
            await DOM.nextUpdate();

            expect(tokenB.getValueFor(target)).to.equal(14);
            removeElement(target);
        });
    });

    describe("setting CSS Custom Properties", () => {
        describe("to static token values", () => {
            it("should emit the value set for an element when emitted to the same element", () => {
                const target = addElement();
                const token = DesignToken.create<number>("test");
                token.setValueFor(target, 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");
                removeElement(target);
            });

            it("should emit the value set for an element ancestor", () => {
                const ancestor = addElement()
                const target = addElement(ancestor);
                const token = DesignToken.create<number>("test");
                token.setValueFor(ancestor, 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");
                removeElement(ancestor);
            });

            it("should emit the value set for an nearest element ancestor", () => {
                const grandparent = addElement();
                const parent = addElement(grandparent);
                const target = addElement(parent);
                const token = DesignToken.create<number>("test");
                token.setValueFor(grandparent, 12)
                token.setValueFor(parent, 14)
                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(grandparent);
            });

            it("should emit the value set for the element when a value is set for both the element and an ancestor", () => {
                const ancestor = addElement()
                const target = addElement(ancestor);
                const token = DesignToken.create<number>("test");
                token.setValueFor(ancestor, 12)
                token.setValueFor(target, 14)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(ancestor);
            });

            it("should update the CSS custom property value for an element when the value changes for that element", async () => {
                const target = addElement();
                const token = DesignToken.create<number>("test");
                token.setValueFor(target, 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");

                token.setValueFor(target, 14);
                await DOM.nextUpdate()

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(target);
            });

            it("should update the CSS custom property value for an element when the value changes for an ancestor node", () => {
                const parent = addElement()
                const target = addElement(parent);
                const token = DesignToken.create<number>("test");
                token.setValueFor(parent, 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");

                token.setValueFor(parent, 14);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(parent);
            });
        })

        describe("to dynamic token values", () => {
            it("should emit the value set for an element when emitted to the same element", () => {
                const target = addElement();
                const token = DesignToken.create<number>("test");
                token.setValueFor(target, () => 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");
                removeElement(target);
            });

            it("should emit the value set for an element ancestor", () => {
                const ancestor = addElement()
                const target = addElement(ancestor);
                const token = DesignToken.create<number>("test");
                token.setValueFor(ancestor, () => 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");
                removeElement(ancestor);
            });

            it("should emit the value set for an nearest element ancestor", () => {
                const grandparent = addElement();
                const parent = addElement(grandparent);
                const target = addElement(parent);
                const token = DesignToken.create<number>("test");
                token.setValueFor(grandparent, () => 12)
                token.setValueFor(parent, () => 14)
                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(grandparent);
            });

            it("should emit the value set for the element when a value is set for both the element and an ancestor", () => {
                const ancestor = addElement()
                const target = addElement(ancestor);
                const token = DesignToken.create<number>("test");
                token.setValueFor(ancestor, () => 12)
                token.setValueFor(target, () => 14)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(ancestor);
            });

            it("should update the CSS custom property value for an element when the value changes for that element", async () => {
                const target = addElement();
                const token = DesignToken.create<number>("test");
                token.setValueFor(target, () => 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");

                token.setValueFor(target, () => 14);
                await DOM.nextUpdate()

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(target);
            });

            it("should update the CSS custom property value for an element when the value changes for an ancestor node", () => {
                const parent = addElement()
                const target = addElement(parent);
                const token = DesignToken.create<number>("test");
                token.setValueFor(parent, () => 12)

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");

                token.setValueFor(parent, () => 14);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
                removeElement(parent);
            });

            it("should update the CSS custom property when a value's dependent design token", async () => {
                const target = addElement();
                const dep = DesignToken.create<number>("dependency");
                const token = DesignToken.create<number>("test");
                dep.setValueFor(target, 6)
                token.setValueFor(target, (element) => dep.getValueFor(element) * 2);

                token.addCustomPropertyFor(target);

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("12");

                dep.setValueFor(target, 7);

                await DOM.nextUpdate();

                expect(window.getComputedStyle(target).getPropertyValue(token.cssCustomProperty)).to.equal("14");
            });
        })
    });
});
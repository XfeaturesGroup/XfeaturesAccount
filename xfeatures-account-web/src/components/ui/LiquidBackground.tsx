import { Suspense } from 'react';
import Spline from '@splinetool/react-spline';

export const LiquidBackground = () => {
    return (
        <div className="absolute inset-0 z-0 bg-black overflow-hidden">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-10 opacity-90 pointer-events-none" />

            <Suspense
                fallback={
                    <div className="w-full h-full bg-black flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white/10 border-t-fluid-peach rounded-full animate-spin" />
                    </div>
                }
            >
                <div className="w-full h-full scale-[1.1] pointer-events-none">
                    <Spline
                        scene="https://prod.spline.design/tq4TMDAfvjt1oKQz/scene.splinecode"
                        className="w-full h-full object-cover"
                        style={{ pointerEvents: 'none' }}
                    />
                </div>
            </Suspense>
        </div>
    );
};
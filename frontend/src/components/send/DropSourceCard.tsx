import { TBody, TTitle } from '@/components/shared/Typography';
import cx from 'classnames'
import { useState } from 'react';
import styles from './DropSourceCard.module.scss';
import PointsIcon from '@/components/points/PointsIcon';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from "lucide-react";
import LabelWithValue from '@/components/shared/LabelWithValue';

function DropSourceCard({eligible}: {eligible?: boolean}) {
  const [flip, setFlip] = useState(false);


  return (
    <div onClick={() => setFlip(!flip)} className={cx('w-[250px] h-[300px] cursor-pointer', flip ? styles.dead : styles.live) }>
      <div className={cx("relative w-full h-full", styles.flipCardInner)}>
        
      <div className={cx(styles.front, 'absolute h-full w-full rounded-lg overflow-hidden')}>
      <div className="border border-line p-4 bg-background w-full h-full flex flex-col items-center gap-6" >
        <div className='flex w-full justify-between items-center'>
                    <div className="flex gap-2 items-center">
                    <PointsIcon/>
                        <TTitle>
                        50
                        </TTitle>
                    </div>
                    <ChevronDown />
                    </div>
                    <Image
                        src='https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg'
                        alt="Send banner"
                        width={100}
                        height={100}
                    />
                    <div className="gap-6">Rootlet 3</div>
                </div>
      </div>
      <div className={cx(styles.back, 'absolute h-full w-full rounded-lg overflow-hidden')}>
        <div className='border border-line p-4 bg-card w-full h-full flex flex-col items-center gap-6'>
        <div className='w-full flex justify-between items-center'>
            <div className="flex gap-2 items-center">
                        <TTitle>
                        Rootlets 3
                        </TTitle>
                    </div>
                    <ChevronUp />
                    </div>
        <TBody>
            Rootlets are unique, living NFTs that evolve with your collection, offering rare bonuses and dynamic visual changes.
        </TBody>

<div className='divide-y divide-solid divide-line w-full flex flex-col'>
        <LabelWithValue
            label="Expiry"
            value="6 months"
            horizontal
            className='my-2'
          />

            <LabelWithValue
            label="Allocation"
            value="50 SEND"
            className='my-2'
          />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default DropSourceCard;
